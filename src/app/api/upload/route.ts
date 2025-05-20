import { NextRequest, NextResponse } from 'next/server';
import { Neo4jInterface } from '@/lib/neo4j';
import { FileProcessor } from '@/lib/file-processor';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { rm } from 'fs/promises';

const neo4j = new Neo4jInterface(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'your_password'
);

const fileProcessor = new FileProcessor();

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const files = formData.getAll('files') as File[];
        const databaseId = formData.get('databaseId') as string;
        
        if (!files.length) {
            return NextResponse.json(
                { error: 'No files provided' },
                { status: 400 }
            );
        }

        if (!databaseId) {
            return NextResponse.json(
                { error: 'Database ID is required' },
                { status: 400 }
            );
        }

        // Create a temporary directory for processing
        const tempDir = join('/tmp', `upload_${Date.now()}`);
        await mkdir(tempDir, { recursive: true });

        try {
            // Process each file
            const processedFiles = [];
            for (const file of files) {
                const buffer = Buffer.from(await file.arrayBuffer());
                const filePath = join(tempDir, file.name);
                await writeFile(filePath, buffer);
                
                const processedFile = await fileProcessor.process_file(filePath);
                processedFiles.push(processedFile);
            }

            // Store in Neo4j
            await neo4j.store_processed_data(processedFiles, databaseId);

            return NextResponse.json({
                message: `Successfully processed ${files.length} files`,
                processedCount: files.length
            });
        } finally {
            // Clean up temporary directory
            // Note: In a production environment, you'd want to use a proper cleanup mechanism
            // This is just a simple example
            try {
                await rm(tempDir, { recursive: true, force: true });
            } catch (error) {
                console.error('Error cleaning up temporary directory:', error);
            }
        }
    } catch (error: any) {
        console.error('Error processing upload:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
} 