import { NextRequest, NextResponse } from 'next/server';
import { Neo4jInterface } from '@/lib/neo4j';

const neo4j = new Neo4jInterface(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'your_password'
);

export async function GET(req: NextRequest) {
    try {
        // Get all databases and their document counts
        const databases = await neo4j.get_databases();
        return NextResponse.json({ databases });
    } catch (error) {
        console.error('Error fetching databases:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
} 