declare module 'openai-whisper' {
    export class Whisper {
        constructor();
        transcribe(audioBuffer: Buffer): Promise<{ text: string }>;
    }
} 