import { readFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import sharp from 'sharp';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import Tesseract from 'tesseract.js';
import ffmpeg from 'fluent-ffmpeg';
import OpenAI from 'openai';
import * as path from 'path';

interface ImageStats {
    channels: Array<{
        mean: number;
        stdev: number;
    }>;
}

export class FileProcessor {
    private visionClient: ImageAnnotatorClient;
    private openai: OpenAI;

    constructor() {
        // Initialize the Vision client
        this.visionClient = new ImageAnnotatorClient();
        // Initialize OpenAI client
        this.openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY
        });
    }

    private async getImageFeatures(imageBuffer: Buffer): Promise<string[]> {
        try {
            // Use sharp to get image metadata and features
            const metadata = await sharp(imageBuffer).metadata();
            const stats = await sharp(imageBuffer).stats() as ImageStats;
            
            // Extract color information
            const dominantColors = stats.channels.map((channel) => ({
                mean: channel.mean,
                stdev: channel.stdev
            }));

            // Create a feature string based on image properties
            const features = [
                `size:${metadata.width}x${metadata.height}`,
                `format:${metadata.format}`,
                `colors:${dominantColors.map((c) => c.mean.toFixed(0)).join(',')}`,
                `brightness:${stats.channels[0].mean.toFixed(0)}`,
                `contrast:${stats.channels[0].stdev.toFixed(0)}`
            ];

            return features;
        } catch (error) {
            console.error('Error getting image features:', error);
            return [];
        }
    }

    private async extractTextFromImage(imageBuffer: Buffer): Promise<string> {
        try {
            // Perform text detection using Google Cloud Vision
            const [result] = await this.visionClient.textDetection(imageBuffer);
            const detections = result.textAnnotations;

            if (!detections || detections.length === 0) {
                return 'No text detected in the image.';
            }

            // The first detection contains the entire text
            const fullText = detections[0].description || '';
            
            // Get individual text blocks with their locations
            const textBlocks = detections.slice(1).map(detection => {
                const vertices = detection.boundingPoly?.vertices || [];
                const location = vertices.map(v => `(${v.x},${v.y})`).join(' ');
                return `${detection.description} [at ${location}]`;
            });

            // Combine the results
            const textDescription = [
                'Full text:',
                fullText,
                '\nText blocks:',
                ...textBlocks
            ].join('\n');

            console.log('Extracted text:', textDescription);
            return textDescription;
        } catch (error) {
            console.error('Error extracting text from image:', error);
            return 'Error analyzing image content.';
        }
    }

    private async extractAudioFromVideo(videoPath: string): Promise<string> {
        const audioPath = videoPath.replace(/\.[^/.]+$/, '.wav');
        await new Promise<void>((resolve, reject) => {
            ffmpeg(videoPath)
                .toFormat('wav')
                .audioChannels(1) // Convert to mono
                .audioFrequency(16000) // Reduce sample rate
                .on('end', () => resolve())
                .on('error', (err) => reject(err))
                .save(audioPath);
        });
        return audioPath;
    }

    private async splitAudioFile(audioPath: string): Promise<string[]> {
        const chunkDuration = 300; // 5 minutes per chunk
        const outputDir = join(audioPath).split('/').slice(0, -1).join('/');
        const baseName = join(audioPath).split('/').pop()?.split('.').slice(0, -1).join('.') || '';
        const chunkFiles: string[] = [];

        // Get audio duration
        const duration = await new Promise<number>((resolve, reject) => {
            ffmpeg.ffprobe(audioPath, (err, metadata) => {
                if (err) reject(err);
                else resolve(metadata.format.duration || 0);
            });
        });

        // Split into chunks
        for (let start = 0; start < duration; start += chunkDuration) {
            const chunkPath = join(outputDir, `${baseName}_chunk_${start}.wav`);
            await new Promise<void>((resolve, reject) => {
                ffmpeg(audioPath)
                    .setStartTime(start)
                    .setDuration(chunkDuration)
                    .audioChannels(1)
                    .audioFrequency(16000)
                    .on('end', () => {
                        chunkFiles.push(chunkPath);
                        resolve();
                    })
                    .on('error', (err) => reject(err))
                    .save(chunkPath);
            });
        }

        return chunkFiles;
    }

    private async transcribeAudio(audioPath: string): Promise<string> {
        try {
            // Check file size
            const stats = await fs.promises.stat(audioPath);
            const maxSize = 25 * 1024 * 1024; // 25MB

            if (stats.size > maxSize) {
                console.log('Audio file too large, splitting into chunks...');
                const chunks = await this.splitAudioFile(audioPath);
                const transcriptions: string[] = [];

                for (const chunk of chunks) {
                    try {
                        const audioFile = await fs.promises.readFile(chunk);
                        const transcription = await this.openai.audio.transcriptions.create({
                            file: new File([audioFile], 'audio.wav', { type: 'audio/wav' }),
                            model: 'whisper-1',
                        });
                        transcriptions.push(transcription.text);
                    } catch (error) {
                        console.error(`Error transcribing chunk ${chunk}:`, error);
                        transcriptions.push('[Error transcribing this segment]');
                    } finally {
                        // Clean up chunk file
                        await fs.promises.unlink(chunk);
                    }
                }

                return transcriptions.join('\n');
            } else {
                // Process single file
                const audioFile = await fs.promises.readFile(audioPath);
                const transcription = await this.openai.audio.transcriptions.create({
                    file: new File([audioFile], 'audio.wav', { type: 'audio/wav' }),
                    model: 'whisper-1',
                });
                return transcription.text;
            }
        } catch (error) {
            console.error('Error transcribing audio:', error);
            return 'Error transcribing audio content.';
        }
    }

    private async extractKeyFrames(videoPath: string): Promise<{ timestamp: number; frame: Buffer }[]> {
        const frames: { timestamp: number; frame: Buffer }[] = [];
        const frameInterval = 5; // Extract a frame every 5 seconds
        const outputDir = join(videoPath).split('/').slice(0, -1).join('/');
        const outputPath = join(outputDir, `frame_%d.png`);

        await new Promise<void>((resolve, reject) => {
            ffmpeg(videoPath)
                .outputOptions('-vf', `select='not(mod(n,${frameInterval * 25}))'`) // 25 fps is standard
                .outputOptions('-vsync', 'vfr')
                .outputOptions('-frame_pts', '1')
                .output(outputPath)
                .on('end', () => {
                    // Read the generated frame files
                    const frameFiles = fs.readdirSync(outputDir)
                        .filter(file => file.startsWith('frame_') && file.endsWith('.png'))
                        .sort((a, b) => {
                            const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                            const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                            return numA - numB;
                        });

                    // Process each frame
                    frameFiles.forEach((file, index) => {
                        const framePath = join(outputDir, file);
                        const frameBuffer = fs.readFileSync(framePath);
                        frames.push({
                            timestamp: index * frameInterval,
                            frame: frameBuffer
                        });
                        // Clean up the frame file
                        fs.unlinkSync(framePath);
                    });

                    resolve();
                })
                .on('error', (err) => reject(err))
                .run();
        });

        return frames;
    }

    private async processVideoFrame(frame: Buffer): Promise<string> {
        try {
            // Convert frame to image and resize for better processing
            const image = await sharp(frame)
                .resize(800) // Resize for better OCR
                .toBuffer();
            
            try {
                // Use Google Cloud Vision for text extraction
                const [result] = await this.visionClient.textDetection(image);
                const detections = result.textAnnotations;

                if (!detections || detections.length === 0) {
                    return 'No text detected in frame.';
                }

                // The first detection contains the entire text
                return detections[0].description || 'No text detected in frame.';
            } catch (visionError) {
                console.error('Vision API error, falling back to basic frame analysis:', visionError);
                // Fallback to basic frame analysis
                const metadata = await sharp(image).metadata();
                return `Frame size: ${metadata.width}x${metadata.height}`;
            }
        } catch (error) {
            console.error('Error processing video frame:', error);
            return 'Error processing frame content.';
        }
    }

    private async processImage(filePath: string): Promise<{ content: string; metadata: any }> {
        try {
            const imageBuffer = await fs.readFile(filePath);
            const base64Image = Buffer.from(imageBuffer as Buffer).toString('base64');
            const [result] = await this.visionClient.documentTextDetection({
                image: { content: base64Image }
            });

            let extractedText = '';
            let tableContent = '';
            let tables: string[][] = [];

            if (result.fullTextAnnotation) {
                extractedText = result.fullTextAnnotation.text || '';
            }

            // Extract tables if present
            if (result.textAnnotations && result.textAnnotations.length > 0) {
                tables = this.extractTablesFromAnnotations(result.textAnnotations);
                if (tables.length > 0) {
                    tableContent = 'Tables found:\n' + tables.map((table, index) => 
                        `Table ${index + 1}:\n${table.join('\n')}`
                    ).join('\n\n');
                }
            }

            // Combine extracted text and table content
            const content = [extractedText, tableContent].filter(Boolean).join('\n\n');

            return {
                content,
                metadata: {
                    filename: path.basename(filePath),
                    file_type: path.extname(filePath).slice(1),
                    media_type: 'image',
                    extracted_text: extractedText,
                    features: {
                        width: result.textAnnotations?.[0]?.boundingPoly?.vertices?.[2]?.x || 0,
                        height: result.textAnnotations?.[0]?.boundingPoly?.vertices?.[2]?.y || 0,
                        hasTables: tables.length > 0,
                        tableCount: tables.length
                    }
                }
            };
        } catch (error) {
            console.error('Error processing image:', error);
            throw error;
        }
    }

    private extractTablesFromAnnotations(annotations: any[]): string[][] {
        const tables: string[][] = [];
        let currentTable: string[] = [];
        let lastY = -1;
        const yThreshold = 10; // Threshold for considering text on the same line

        // Sort annotations by y-coordinate (top to bottom)
        const sortedAnnotations = annotations.slice(1).sort((a, b) => {
            const aY = a.boundingPoly.vertices[0].y;
            const bY = b.boundingPoly.vertices[0].y;
            return aY - bY;
        });

        for (const annotation of sortedAnnotations) {
            const text = annotation.description;
            const y = annotation.boundingPoly.vertices[0].y;

            // Check if this is a new line
            if (lastY === -1 || Math.abs(y - lastY) > yThreshold) {
                if (currentTable.length > 0) {
                    tables.push([...currentTable]);
                    currentTable = [];
                }
                lastY = y;
            }

            // Add text to current line
            currentTable.push(text);
        }

        // Add the last table if it exists
        if (currentTable.length > 0) {
            tables.push(currentTable);
        }

        // Filter out non-table content (e.g., single lines)
        return tables.filter(table => table.length > 1);
    }

    async process_file(filePath: string) {
        const fileStats = fs.statSync(filePath);
        const fileType = join(filePath).split('.').pop()?.toLowerCase() || 'txt';
        const mediaType = this.getMediaType(fileType);

        let content = '';
        let extractedText = '';
        let features: Record<string, string | number> = {};

        try {
            switch (mediaType) {
                case 'audio':
                    // Transcribe audio
                    extractedText = await this.transcribeAudio(filePath);
                    content = `[Audio: ${join(filePath).split('/').pop()}]\nTranscription: ${extractedText}`;
                    features = {
                        duration: Math.round(fileStats.size / 1024), // Convert to KB
                        format: fileType
                    };
                    break;

                case 'video':
                    try {
                        // Extract audio and transcribe
                        const audioPath = await this.extractAudioFromVideo(filePath);
                        extractedText = await this.transcribeAudio(audioPath);
                        
                        // Extract and process key frames
                        const frames = await this.extractKeyFrames(filePath);
                        const frameTexts = await Promise.all(
                            frames.map(async ({ timestamp, frame }) => {
                                const text = await this.processVideoFrame(frame);
                                return `[${timestamp}s] ${text}`;
                            })
                        );

                        content = `[Video: ${join(filePath).split('/').pop()}]\n` +
                                 `Transcription: ${extractedText}\n` +
                                 `Key Frames:\n${frameTexts.join('\n')}`;
                        
                        features = {
                            duration: Math.round(fileStats.size / 1024), // Convert to KB
                            format: fileType,
                            frameCount: frames.length
                        };

                        // Clean up temporary audio file
                        await fs.promises.unlink(audioPath);
                    } catch (error) {
                        console.error('Error processing video:', error);
                        content = `[Video: ${join(filePath).split('/').pop()}]\nError processing video content.`;
                        features = {
                            format: fileType,
                            size: Math.round(fileStats.size / 1024), // Convert to KB
                            error: 'Processing failed'
                        };
                    }
                    break;

                case 'image':
                    // Existing image processing code
                    const imageBuffer = await readFile(filePath);
                    
                    // Get image features
                    const imageFeatures = await this.getImageFeatures(imageBuffer);
                    
                    // Extract text using Google Cloud Vision
                    extractedText = await this.extractTextFromImage(imageBuffer);
                    
                    console.log('features', imageFeatures);
                    console.log('extractedText', extractedText);
                    
                    // Store image as base64
                    content = `data:image/${fileType};base64,${imageBuffer.toString('base64')}`;
                    
                    // Get image metadata
                    const metadata = await sharp(filePath).metadata();
                    features = {
                        width: metadata.width || 0,
                        height: metadata.height || 0,
                        format: metadata.format || fileType,
                        size: Math.round(fileStats.size / 1024) // Convert to KB
                    };
                    break;

                default:
                    // Handle text files
                    content = fs.readFileSync(filePath, 'utf-8');
                    features = {
                        size: Math.round(fileStats.size / 1024), // Convert to KB
                        format: fileType
                    };
            }

            return {
                id: uuidv4(),
                content,
                metadata: {
                    filename: join(filePath).split('/').pop() || 'unknown',
                    file_type: fileType,
                    file_size: Math.round(fileStats.size / 1024), // Convert to KB
                    media_type: mediaType,
                    extracted_text: extractedText,
                    features: JSON.stringify(features) // Convert features to string for Neo4j
                }
            };
        } catch (error) {
            console.error('Error processing file:', error);
            throw error;
        }
    }

    private getMediaType(fileType: string): 'image' | 'audio' | 'video' | 'text' {
        const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
        const audioTypes = ['mp3', 'wav', 'ogg', 'm4a', 'flac'];
        const videoTypes = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv'];

        if (imageTypes.includes(fileType)) return 'image';
        if (audioTypes.includes(fileType)) return 'audio';
        if (videoTypes.includes(fileType)) return 'video';
        return 'text';
    }
} 