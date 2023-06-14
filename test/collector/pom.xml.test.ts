'use strict';

import { expect } from 'chai';
import { DependencyCollector } from '../../src/collector/pom.xml';

describe('Maven pom.xml parser test', () => {

    it('tests pom.xml with empty string', async () => {
        const pom = `
        `;
        const deps = await new DependencyCollector(pom).collect(pom);
        expect(deps.length).equal(0);
    });

    it('tests pom.xml with empty project', async () => {
        const pom = `<project>

        </project>
       `;
        const deps = await new DependencyCollector(pom).collect(pom);
        expect(deps.length).equal(0);
    });

    it('tests pom.xml with empty project + dependencies', async () => {
        const pom = `<project>
            <dependencies>

            </dependencies>
        </project>
        `;
        const deps = await new DependencyCollector(pom).collect(pom);
        expect(deps.length).equal(0);
    });

    it('tests valid pom.xml', async () => {
        const pom = `
        <project>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <scope>test</scope>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>2.4</version>
                </dependency>
            </dependencies>
         </project>
        `;
        const deps = await new DependencyCollector(pom).collect(pom);
        expect(deps).is.eql([{
            name: { value: 'foo:bar', position: { line: 10, column: 17 } },
            version: { value: '2.4', position: { line: 13, column: 30 } },
        }]);
    });

    it('highlights duplicate dependencies', async () => {
        const effective = `
        <project>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <scope>test</scope>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>2.4</version>
                </dependency>
            </dependencies>
         </project>
        `;

        const original = `
        <project>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <scope>test</scope>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>2.4</version>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>2.4</version>
                </dependency>
            </dependencies>
         </project>
        `;
        const deps = await new DependencyCollector(original).collect(effective);
        expect(deps).is.eql([{
            name: { value: 'foo:bar', position: { line: 10, column: 17 } },
            version: { value: '2.4', position: { line: 13, column: 30 } },
        },{
            name: { value: 'foo:bar', position: { line: 15, column: 17 } },
            version: { value: '2.4', position: { line: 18, column: 30 } },
        }]);
    });

    it('highlights duplicate dependencies when one has version', async () => {
        const effective = `
        <project>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <scope>test</scope>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>2.4</version>
                </dependency>
            </dependencies>
         </project>
        `;

        const original = `
        <project>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <scope>test</scope>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>2.4</version>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                </dependency>
            </dependencies>
         </project>
        `;
        const deps = await new DependencyCollector(original).collect(effective);
        expect(deps).is.eql([{
            name: { value: 'foo:bar', position: { line: 10, column: 17 } },
            version: { value: '2.4', position: { line: 13, column: 30 } },
        },{
            name: { value: 'foo:bar', position: { line: 15, column: 17 } },
            version: { value: '2.4', position: { line: 0, column: 0 } },
            context: { value: `<dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>__VERSION__</version>
                </dependency>`,
                range: {
                    end: {
                        character: 29,
                        line: 17
                    },
                    start: {
                        character: 16,
                        line: 14
                    }
                }
            }
        }]);
    });

    it('highlights duplicate dependencies when none has version', async () => {
        const effective = `
        <project>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <scope>test</scope>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>2.4</version>
                </dependency>
            </dependencies>
         </project>
        `;

        const original = `
        <project>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <scope>test</scope>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                </dependency>
            </dependencies>
         </project>
        `;
        const deps = await new DependencyCollector(original).collect(effective);
        expect(deps).is.eql([{
            name: { value: 'foo:bar', position: { line: 10, column: 17 } },
            version: { value: '2.4', position: { line: 0, column: 0 } },
            context: { value: `<dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>__VERSION__</version>
                </dependency>`,
                range: {
                    end: {
                        character: 29,
                        line: 12
                    },
                    start: {
                        character: 16,
                        line: 9
                    }
                }
            }
        },{
            name: { value: 'foo:bar', position: { line: 14, column: 17 } },
            version: { value: '2.4', position: { line: 0, column: 0 } },
            context: { value: `<dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>__VERSION__</version>
                </dependency>`,
                range: {
                    end: {
                        character: 29,
                        line: 16
                    },
                    start: {
                        character: 16,
                        line: 13
                    }
                }
            }
        }]);
    });

    it('tests pom.xml with multiple dependencies', async () => {
        const pom = `
        <project>
            <plugins>
                <dependencies>
                    <dependency>
                        <groupId>plugins</groupId>
                        <artifactId>a</artifactId>
                        <version>2.3</version>
                    </dependency>
                </dependencies>
            </plugins>
            <dependencies>
                <dependency>
                    <groupId>dep</groupId>
                    <artifactId>a</artifactId>
                    <version>10.1</version>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>2.4</version>
                </dependency>
            </dependencies>
         </project>
        `;
        const deps = await new DependencyCollector(pom).collect(pom);
        expect(deps).is.eql([{
            name: { value: 'plugins:a', position: { line: 5, column: 21 } },
            version: { value: '2.3', position: { line: 8, column: 34 } }
        }, {
            name: { value: 'dep:a', position: { line: 13, column: 17 } },
            version: { value: '10.1', position: { line: 16, column: 30 } }
        }, {
            name: { value: 'foo:bar', position: { line: 18, column: 17 } },
            version: { value: '2.4', position: { line: 21, column: 30 } }
        }]);
    });

    it('tests pom.xml with only test scope', async () => {
        const pom = `
            <project>
                <plugins>
                    <dependencies>
                        <dependency>
                            <groupId>plugins</groupId>
                            <artifactId>a</artifactId>
                            <version>2.3</version>
                            <scope>test</scope>
                        </dependency>
                    </dependencies>
                </plugins>
                <dependencies>
                    <dependency>
                        <groupId>dep</groupId>
                        <artifactId>a</artifactId>
                        <version>10.1</version>
                        <scope>test</scope>
                    </dependency>
                    <dependency>
                        <groupId>foo</groupId>
                        <artifactId>bar</artifactId>
                        <version>2.4</version>
                        <scope>test</scope>
                    </dependency>
                </dependencies>
            </project>
        `;
        const deps = await new DependencyCollector(pom).collect(pom);
        expect(deps.length).equal(0);
    });

    it('tests pom.xml with invalid dependencies', async () => {
        const pom = `
        <project>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>2.4</version>
                </dependency>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>invalid</artifactId>
                </dependency>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId></artifactId>
                    </version>
                </dependency>
            </dependencies>
         </project>
        `;
        const deps = await new DependencyCollector(pom).collect(pom);
        expect(deps).is.eql([{
            name: { value: 'c:ab-cd', position: { line: 4, column: 17 } },
            version: { value: '2.3', position: { line: 7, column: 30 } }
        }, {
            name: { value: 'foo:bar', position: { line: 9, column: 17 } },
            version: { value: '2.4', position: { line: 12, column: 30 } }
        }]);
    });

    it('tests pom.xml with dependencyManagement scope', async () => {
        const pom = `
        <project>
            <dependencyManagement>
                <dependency>
                    <!-- Dependency with scope as runtime -->
                    <groupId>{a.groupId}</groupId>
                    <artifactId>bc</artifactId>
                    <version>{a.version}</version>
                    <scope>runtime</scope>
                </dependency>
                <dependency>
                    <!-- Dependency with scope as compile -->
                    <groupId>a</groupId>
                    <artifactId>b-c</artifactId>
                    <version>1.2.3</version>
                    <scope>compile</scope>
                    <optional>true</optional>
                </dependency>
            </dependencyManagement>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>2.4</version>
                </dependency>
            </dependencies>
         </project>
        `
        const deps = await new DependencyCollector(pom).collect(pom);
        expect(deps).is.eql([{
            name: { value: 'c:ab-cd', position: { line: 21, column: 17 } },
            version: { value: '2.3', position: { line: 24, column: 30 } }
        }, {
            name: { value: 'foo:bar', position: { line: 26, column: 17 } },
            version: { value: '2.4', position: { line: 29, column: 30 } }
        }]);
    });

    it('tests pom.xml without version and with properties', async () => {
        const original = `
        <project>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                </dependency>
                <dependency>
                    <groupId>\${some.example}</groupId>
                    <artifactId>\${other.example}</artifactId>
                </dependency>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-other</artifactId>
                </dependency>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId></artifactId>
                    </version>
                </dependency>
            </dependencies>
         </project>
        `;

        const effective = `
        <project>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                </dependency>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>bar</artifactId>
                    <version>2.4</version>
                </dependency>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-other</artifactId>
                    <version>1.2.3</version>
                </dependency>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId></artifactId>
                    </version>
                </dependency>
            </dependencies>
         </project>
        `;
        const deps = await new DependencyCollector(original).collect(effective);
        expect(deps).is.eql([{
            name: { value: 'c:ab-cd', position: { line: 4, column: 17 } },
            version: { value: '2.3', position: { line: 7, column: 30 } }
        }, {
            name: { value: '${some.example}:${other.example}', position: { line: 9, column: 17 } },
            version: { value: '2.4', position: { line: 0, column: 0 } },
            context: { value: `<dependency>
                    <groupId>\${some.example}</groupId>
                    <artifactId>\${other.example}</artifactId>
                    <version>__VERSION__</version>
                </dependency>`,
                range: {
                    end: {
                        character: 29,
                        line: 11
                    },
                    start: {
                        character: 16,
                        line: 8
                    }
                }
            }
        }, {
            name: { value: 'c:ab-other', position: { line: 13, column: 17 } },
            version: { value: '1.2.3', position: { line: 0, column: 0 } },
            context: { value: `<dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-other</artifactId>
                    <version>__VERSION__</version>
                </dependency>`,
                range: {
                    end: {
                        character: 29,
                        line: 15
                    },
                    start: {
                        character: 16,
                        line: 12
                    }
                }
            }
        }]);
    });

    it('tests pom.xml with only dependencyManagement scope', async () => {
        const pom = `
        <project>
            <dependencyManagement>
                <dependency>
                    <!-- Dependency with scope as runtime -->
                    <groupId>{a.groupId}</groupId>
                    <artifactId>bc</artifactId>
                    <version>{a.version}</version>
                    <scope>runtime</scope>
                </dependency>
                <dependency>
                    <!-- Dependency with scope as compile -->
                    <groupId>a</groupId>
                    <artifactId>b-c</artifactId>
                    <version>1.2.3</version>
                    <scope>compile</scope>
                    <optional>true</optional>
                </dependency>
            </dependencyManagement>
         </project>
        `;
        const deps = await new DependencyCollector(pom).collect(pom);
        expect(deps.length).equal(0);
    });
});
