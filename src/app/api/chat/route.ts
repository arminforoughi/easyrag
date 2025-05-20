import { NextRequest, NextResponse } from 'next/server';
import { Neo4jInterface } from '@/lib/neo4j';
import { FileProcessor } from '@/lib/file-processor';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { rm } from 'fs/promises';
import { Chatbot } from '@/lib/chatbot';

// Initialize Neo4j connection
const neo4j = new Neo4jInterface(
    process.env.NEO4J_URI || '',
    process.env.NEO4J_USER || '',
    process.env.NEO4J_PASSWORD || ''
);

const fileProcessor = new FileProcessor();
const chatbot = new Chatbot(neo4j);

export async function POST(req: NextRequest) {
    try {
        console.log('Received chat request');
        const formData = await req.formData();
        const query = formData.get('query') as string;
        const file = formData.get('file') as File | null;
        const databaseId = formData.get('databaseId') as string;

        console.log('Request data:', { query, file: file?.name, databaseId });

        if (!databaseId) {
            console.log('No database ID provided');
            return NextResponse.json(
                { error: 'Database ID is required' },
                { status: 400 }
            );
        }

        let fileProcessed = false;
        let fileResponse = '';

        // Process file if provided
        if (file) {
            try {
                console.log('Processing file:', file.name);
                // Create a temporary directory for processing
                const tempDir = join('/tmp', `chat_${Date.now()}`);
                await mkdir(tempDir, { recursive: true });

                try {
                    // Convert File to Buffer
                    const arrayBuffer = await file.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const filePath = join(tempDir, file.name);
                    
                    // Write file to disk
                    await writeFile(filePath, buffer);
                    console.log('File written to:', filePath);
                    
                    // Process the file
                    const processedFile = await fileProcessor.process_file(filePath);
                    console.log('File processed successfully');
                    
                    // Store in Neo4j
                    await neo4j.store_processed_data([processedFile], databaseId);
                    console.log('File stored in Neo4j');

                    fileProcessed = true;
                    fileResponse = `Successfully processed and stored file: ${file.name}`;
                } finally {
                    // Clean up temporary directory
                    try {
                        await rm(tempDir, { recursive: true, force: true });
                        console.log('Temporary directory cleaned up');
                    } catch (error) {
                        console.error('Error cleaning up temporary directory:', error);
                    }
                }
            } catch (error: any) {
                console.error('Error processing file:', error);
                return NextResponse.json(
                    { error: `Error processing file: ${error.message || 'Unknown error'}` },
                    { status: 500 }
                );
            }
        }

        // Process query if provided
        if (query) {
            try {
                console.log('Searching database with query:', query);
                // Search the database
                const result = await chatbot.chat(query, databaseId);
                console.log('Search results:', result);
                
                if (result.documents.length === 0) {
                    return NextResponse.json({
                        response: fileProcessed 
                            ? `${fileResponse}\n\nNo relevant documents found. Try using different keywords or uploading more documents.`
                            : 'No relevant documents found. Try using different keywords or uploading more documents.'
                    });
                }

                // Format response with file names
                const fileNames = result.documents.map(doc => doc.filename).join(', ');
                const responseWithFiles = `${result.response}\n\nRetrieved from: ${fileNames}`;

                // Return the AI's response with file names
                return NextResponse.json({ 
                    response: fileProcessed
                        ? `${fileResponse}\n\n${responseWithFiles}`
                        : responseWithFiles
                });
            } catch (error: any) {
                console.error('Error searching database:', error);
                return NextResponse.json(
                    { error: `Error searching database: ${error.message || 'Unknown error'}` },
                    { status: 500 }
                );
            }
        } else if (!file) {
            console.log('No query or file provided');
            return NextResponse.json(
                { error: 'Either a file or a query must be provided' },
                { status: 400 }
            );
        }

        // If we only processed a file without a query
        return NextResponse.json({
            response: fileResponse
        });
    } catch (error: any) {
        console.error('Error processing request:', error);
        return NextResponse.json(
            { error: `Internal server error: ${error.message || 'Unknown error'}` },
            { status: 500 }
        );
    }
} 