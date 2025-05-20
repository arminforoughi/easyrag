import { NextRequest, NextResponse } from 'next/server';
import { Neo4jInterface } from '@/lib/neo4j';

const neo4j = new Neo4jInterface(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'your_password'
);

export async function GET(req: NextRequest) {
    try {
        console.log('Testing Neo4j connection...');
        console.log('Connection details:', {
            uri: process.env.NEO4J_URI,
            user: process.env.NEO4J_USER,
            password: process.env.NEO4J_PASSWORD ? '****' : undefined
        });

        // Test the connection by getting databases
        const databases = await neo4j.get_databases();
        console.log('Successfully connected to Neo4j');
        console.log('Available databases:', databases);

        // Test a simple document search
        const testQuery = 'test';
        const searchResults = await neo4j.search_documents(testQuery, 'default');
        console.log('Test search results:', searchResults);

        return NextResponse.json({
            status: 'success',
            message: 'Successfully connected to Neo4j',
            databases,
            testSearch: {
                query: testQuery,
                results: searchResults
            }
        });
    } catch (error: any) {
        console.error('Error connecting to Neo4j:', error);
        return NextResponse.json(
            {
                status: 'error',
                message: `Failed to connect to Neo4j: ${error.message || 'Unknown error'}`,
                details: error.toString()
            },
            { status: 500 }
        );
    }
} 