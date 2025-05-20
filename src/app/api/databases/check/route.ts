import { NextRequest, NextResponse } from 'next/server';
import { Neo4jInterface } from '@/lib/neo4j';

const neo4j = new Neo4jInterface(
    process.env.NEO4J_URI || 'bolt://localhost:7687',
    process.env.NEO4J_USER || 'neo4j',
    process.env.NEO4J_PASSWORD || 'your_password'
);

export async function GET(req: NextRequest) {
    try {
        const contents = await neo4j.check_database_contents();
        return NextResponse.json({ contents });
    } catch (error: any) {
        console.error('Error checking database contents:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
} 