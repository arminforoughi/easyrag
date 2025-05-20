import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { Neo4jInterface } from '@/lib/neo4j';

const neo4j = new Neo4jInterface(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'your_password'
);

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const name = body?.name || 'Untitled Dataset';
        const databaseId = uuidv4();

        // Optionally, create a dummy Document node to register the database in Neo4j
        // Or just return the ID and let the first upload create the node
        // Here, we'll just return the ID and name

        return NextResponse.json({ databaseId, name });
    } catch (error: any) {
        console.error('Error creating database:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
} 