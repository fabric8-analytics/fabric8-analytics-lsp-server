'use strict';

import { expect } from 'chai';
import { DependencyCollector } from '../../src/collector/pom.xml';

describe('Maven pom.xml parser test', () => {
    const collector = new DependencyCollector();

    it('tests pom.xml with empty string', async () => {
        const deps = await collector.collect(
        `
        `);
        expect(deps.length).equal(0);
    });

    it('tests pom.xml with empty project', async () => {
        const deps = await collector.collect(
        `<project>
            
         </project>
        `);
        expect(deps.length).equal(0);
    });

    it('tests pom.xml with empty project + dependencies', async () => {
        const deps = await collector.collect(
        `<project>
            <dependencies>
      
            </dependencies>
         </project>
        `);
        expect(deps.length).equal(0);
    });

    it('tests valid pom.xml', async () => {
        const deps = await collector.collect(
        `
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
        `);
        expect(deps).is.eql([{
          name: {value: 'foo:bar', position: {line: 0, column: 0}},
          version: {value: '2.4', position: {line: 13, column: 30}}
        }]);
    });

    it('tests pom.xml with multiple dependencies', async () => {
        const deps = await collector.collect(
        `
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
        `);
        expect(deps).is.eql([{
          name: {value: 'plugins:a', position: {line: 0, column: 0}},
          version: {value: '2.3', position: {line: 8, column: 34}}
        }, {
          name: {value: 'dep:a', position: {line: 0, column: 0}},
          version: {value: '10.1', position: {line: 16, column: 30}}
        }, {
          name: {value: 'foo:bar', position: {line: 0, column: 0}},
          version: {value: '2.4', position: {line: 21, column: 30}}
        }]);
    });

    it('tests pom.xml with only test scope', async () => {
        const deps = await collector.collect(
        `
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
        `);
        expect(deps.length).equal(0);
    });

    it('tests pom.xml with invalid dependencies', async () => {
        const deps = await collector.collect(
        `
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
                    <artifactId>ab-cd</artifactId>
                </dependency>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId></artifactId>
                    </version>
                </dependency>
            </dependencies>
         </project>
        `);
        expect(deps).is.eql([{
            name: {value: 'c:ab-cd', position: {line: 0, column: 0}},
            version: {value: '2.3', position: {line: 7, column: 30}}
        },{
            name: {value: 'foo:bar', position: {line: 0, column: 0}},
            version: {value: '2.4', position: {line: 12, column: 30}}
        }]);
    });

    it('tests pom.xml with dependencyManagement scope', async () => {
        const deps = await collector.collect(
        `
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
        `);
        expect(deps).is.eql([{
          name: {value: 'c:ab-cd', position: {line: 0, column: 0}},
          version: {value: '2.3', position: {line: 24, column: 30}}
        },{
          name: {value: 'foo:bar', position: {line: 0, column: 0}},
          version: {value: '2.4', position: {line: 29, column: 30}}
        }]);
    });

    it('tests pom.xml with only dependencyManagement scope', async () => {
        const deps = await collector.collect(
        `
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
        `);
        expect(deps.length).equal(0);
    });
});
