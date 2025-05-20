import { NextResponse } from 'next/server';
import { Neo4jInterface } from '@/lib/neo4j';

export async function POST(request: Request) {
    try {
        const { query } = await request.json();

        if (!query) {
            return NextResponse.json(
                { error: 'Query is required' },
                { status: 400 }
            );
        }

        // Get Neo4j connection details from environment variables
        const uri = process.env.NEO4J_URI;
        const user = process.env.NEO4J_USER;
        const password = process.env.NEO4J_PASSWORD;

        if (!uri || !user || !password) {
            return NextResponse.json(
                { error: 'Neo4j connection details not configured' },
                { status: 500 }
            );
        }

        const neo4j = new Neo4jInterface(uri, user, password);
        const results = await neo4j.runQuery(query);
        await neo4j.close(); // Close the connection after use

        return NextResponse.json({ results });
    } catch (error) {
        console.error('Error executing graph query:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to execute query' },
            { status: 500 }
        );
    }
} 