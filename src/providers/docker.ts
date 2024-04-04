/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { IImageProvider, IImage, Image } from '../imageAnalysis/collector';

/**
 * Process entries found in the Dockerfile file.
 */
export class ImageProvider implements IImageProvider {

    args: Map<string, string> = new Map<string, string>();

    FROM_REGEX: RegExp = /^\s*FROM\s+(.*)/;
    ARG_REGEX: RegExp = /^\s*ARG\s+(.*)/;
    PLATFORM_REGEX: RegExp = /--platform=([^\s]+)/g;
    AS_REGEX: RegExp = /\s+AS\s+\S+/gi;

    /**
     * Parses the provided string as an array of lines.
     * @param contents - The string content to parse into lines.
     * @returns An array of strings representing lines from the provided content.
     */
    private parseTxtDoc(contents: string): string[] {
        return contents.split('\n');
    }

    private replaceArgsInString(imageData: string): string {
        return imageData.replace(/\${([^{}]+)}/g, (match, key) => {
            const value = this.args.get(key) || '';
            return value;
        });
    }

    /**
     * Parses a line from the file and extracts dependency information.
     * @param line - The line to parse for dependency information.
     * @param index - The index of the line in the file.
     * @returns An IDependency object representing the parsed dependency or null if no dependency is found.
     */
    private parseLine(line: string, index: number): IImage | null {
        const argMatch = line.match(this.ARG_REGEX);
        if (argMatch) {
            const argData = argMatch[1].trim().split('=');
            this.args.set(argData[0], argData[1]);
        }
        
        const imageMatch = line.match(this.FROM_REGEX);
        if (imageMatch) {
            let imageData = imageMatch[1];
            imageData = this.replaceArgsInString(imageData);
            imageData = imageData.replace(this.PLATFORM_REGEX, '');
            imageData = imageData.replace(this.AS_REGEX, '');
            imageData = imageData.trim();

            if (imageData === 'scratch') {
                return;
            }

            const image = new Image ({ value: imageData, position: { line: index + 1, column: 0 } }, line);

            const platformMatch = line.match(this.PLATFORM_REGEX);
            if (platformMatch) {
                image.platform = platformMatch[0].split('=')[1];
            }

            return image;
        }
        return;
    }

    /**
     * Extracts dependencies from lines parsed from the file.
     * @param lines - An array of strings representing lines from the file.
     * @returns An array of IDependency objects representing extracted dependencies.
     */
    private extractDependenciesFromLines(lines: string[]): IImage[] {
        return lines.reduce((images: IImage[], line: string, index: number) => {
            const parsedImage = this.parseLine(line, index);
            if (parsedImage) {
                images.push(parsedImage);
            }
            return images;
        }, []);
    }

    /**
     * Collects dependencies from the provided manifest contents.
     * @param contents - The manifest content to collect dependencies from.
     * @returns A Promise resolving to an array of IDependency objects representing collected dependencies.
     */
    async collect(contents: string): Promise<IImage[]> {
        const lines: string[] = this.parseTxtDoc(contents);
        return this.extractDependenciesFromLines(lines);
    }
}
