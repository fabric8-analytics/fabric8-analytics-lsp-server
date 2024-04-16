/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { VERSION_PLACEHOLDER } from '../constants';
import { IDependencyProvider, EcosystemDependencyResolver, IDependency, Dependency } from '../dependencyAnalysis/collector';

/**
 * Process entries found in the requirements.txt file.
 */
export class DependencyProvider extends EcosystemDependencyResolver implements IDependencyProvider {
    
    args: Map<string, string> = new Map<string, string>();

    /**
     * Regular expression for matching 'FROM' statements.
     */
    COMMENT_REGEX: RegExp = /\/\*[\s\S]*?\*\//g;

    /**
     * Regular expression for matching 'FROM' statements.
     */
    FIND_KEY_VALUE_PAIRS_REGEX: RegExp = /\b(\w+)\s*:\s*(['"])(.*?)\2/g;

    /**
     * Regular expression for matching 'FROM' statements.
     */
    SPLIT_KEY_VALUE_PAIRS_REGEX: RegExp = /\s*:\s*/;

    /**
     * Regular expression for matching 'FROM' statements.
     */
    BETWEEN_QUOTES_REGEX: RegExp = /(['"])(.*?)\1/;

    
    constructor() {
        super('maven'); // set ecosystem to 'maven'
    }

    /**
     * Parses the provided string as an array of lines.
     * @param contents - The string content to parse into lines.
     * @returns An array of strings representing lines from the provided content.
     */
    private parseTxtDoc(contents: string): string[] {
        return contents.split('\n');
    }

    /**
     * Replaces placeholders in a string with values from a args map.
     * @param imageData - The string containing placeholders.
     * @returns The string with placeholders replaced by corresponding values from the args map.
     * @private
     */
    private replaceArgsInString(imageData: string): string {
        this.args.forEach((value, key) => {
            imageData = imageData.replace(`$\{${key}}`, value).replace(`$${key}`, value);
        });        
        return imageData;
    }

    /**
     * Parses a line from the file and extracts dependency information.
     * @param line - The line to parse for dependency information.
     * @param index - The index of the line in the file.
     * @returns An IDependency object representing the parsed dependency or null if no dependency is found.
     */
    private parseLine(line: string, cleanLine: string, index: number): IDependency | null {
        const myClassObj = { group: '', name: '', version: '' };
        let depData: string;
        let quoteUsed: string;

        const keyValuePairs = cleanLine.match(this.FIND_KEY_VALUE_PAIRS_REGEX);
        if (keyValuePairs) {
            keyValuePairs.forEach(pair => {
                const [key, value] = pair.split(this.SPLIT_KEY_VALUE_PAIRS_REGEX);
                const match = value.match(this.BETWEEN_QUOTES_REGEX);
                quoteUsed = match[1];
                const valueData = match[2];
                switch (key) {
                    case 'group':
                        myClassObj.group = valueData;
                        break;
                    case 'name':
                        myClassObj.name = valueData;
                        break;
                    case 'version':
                        myClassObj.version = valueData;
                        break;
                }
            });
        } else {
            const match = cleanLine.match(this.BETWEEN_QUOTES_REGEX);
            quoteUsed = match[1];
            depData = match[2];
            const depDataList = depData.split(':');
            myClassObj.group = depDataList[0];
            myClassObj.name = depDataList[1] || '';
            myClassObj.version = depDataList[2] || '';
        }

        if (myClassObj.group === '' || myClassObj.name === '') {return null; }

        let depName: string = `${myClassObj.group}/${myClassObj.name}`;
        if (depName.includes('$')) {
           depName = this.replaceArgsInString(depName);
        }

        const dep = new Dependency ({ value: depName, position: { line: 0, column: 0 } });

        const depVersion: string = myClassObj.version;
        if (depVersion) {
         dep.version = { value: depVersion, position: { line: index + 1, column: line.indexOf(depVersion) + 1 } };
        } else {
            if (keyValuePairs) {
                dep.context = { value: `name: ${quoteUsed}${myClassObj.name}${quoteUsed}, version: ${quoteUsed}${VERSION_PLACEHOLDER}${quoteUsed}`, range: {
                    start: { line: index, character: line.indexOf(`name: ${quoteUsed}${myClassObj.name}${quoteUsed}`)},
                    end: { line: index, character: line.indexOf(`name: ${quoteUsed}${myClassObj.name}${quoteUsed}`) + `name: ${quoteUsed}${myClassObj.name}${quoteUsed}`.length}
                    },
                };    
            } else {
                dep.context = { value: `${depData}:${VERSION_PLACEHOLDER}`, range: {
                    start: { line: index, character: line.indexOf(depData)},
                    end: { line: index, character: line.indexOf(depData) + depData.length}
                    }
                };
            }
        }
        return dep;
    }

    /**
     * Extracts dependencies from lines parsed from the file.
     * @param lines - An array of strings representing lines from the file.
     * @returns An array of IDependency objects representing extracted dependencies.
     */
    private extractDependenciesFromLines(lines: string[]): IDependency[] {
        let isSingleDependency: boolean = false;
        let isDependencyBlock: boolean = false;
        let isSingleArgument: boolean = false;
        let isArgumentBlock: boolean = false;
        let innerDepScopeBrackets: number = 0;
        return lines.reduce((dependencies: IDependency[], line: string, index: number) => {

            const cleanLine = line.split('//')[0].replace(this.COMMENT_REGEX, '').trim(); // Remove comments
            if (!cleanLine) { return dependencies; } // Skip empty lines
            const parsedLine = cleanLine.includes('$') ? this.replaceArgsInString(cleanLine) : cleanLine;
            const countOpenBrackets = (parsedLine.match(/{/g) || []).length; 
            const countCloseBrackets = (parsedLine.match(/}/g) || []).length; 

            if (isDependencyBlock) {
                innerDepScopeBrackets+=countOpenBrackets;
                innerDepScopeBrackets-=countCloseBrackets;
            }

            if (isSingleDependency) {
                if (parsedLine.startsWith('{')) {
                    innerDepScopeBrackets+=countOpenBrackets;
                    innerDepScopeBrackets-=countCloseBrackets;
                    isDependencyBlock = true;
                }
                isSingleDependency = false;
            }

            if (parsedLine.includes('dependencies')) {  
                innerDepScopeBrackets+=countOpenBrackets;
                innerDepScopeBrackets-=countCloseBrackets;

                if (innerDepScopeBrackets > 0) {
                    isDependencyBlock = true;
                }
                
                if (innerDepScopeBrackets === 0) {
                    isSingleDependency = true;
                }
            }

            if (isSingleDependency || isDependencyBlock) {

                if (innerDepScopeBrackets === 0) {
                    isDependencyBlock = false;
                }

                if (!this.BETWEEN_QUOTES_REGEX.test(parsedLine)) {
                    return dependencies;
                }

                const parsedDependency = this.parseLine(line, cleanLine, index);
                if (parsedDependency) {
                    dependencies.push(parsedDependency);
                }
                return dependencies;
            }

            if (isSingleArgument) {
                if (parsedLine.includes('{')) {
                    isArgumentBlock = true;
                }
                isSingleArgument = false;
            }

            if (parsedLine.includes('ext')) {               
                if (parsedLine.includes('{')) {
                    isArgumentBlock = true;
                } else {
                    isSingleArgument = true;
                }
            }

            if (isSingleArgument || isArgumentBlock) {
                if (parsedLine.includes('}')) {
                    isArgumentBlock = false;
                }
                
                if (!this.BETWEEN_QUOTES_REGEX.test(parsedLine)) {
                    return dependencies;
                }

                if (parsedLine.includes('=')) {
                    const argData = parsedLine.split('=');
                    this.args.set(argData[0].trim(), argData[1].trim().replace(this.BETWEEN_QUOTES_REGEX, '$2'));
                }
            }

            return dependencies;
        }, []);
    }

    /**
     * Collects dependencies from the provided manifest contents.
     * @param contents - The manifest content to collect dependencies from.
     * @returns A Promise resolving to an array of IDependency objects representing collected dependencies.
     */
    async collect(contents: string): Promise<IDependency[]> {
        const lines: string[] = this.parseTxtDoc(contents);
        return this.extractDependenciesFromLines(lines);
    }
}
