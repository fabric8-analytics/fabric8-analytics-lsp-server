import { expect } from 'chai';
import { PomXmlDependencyCollector } from '../src/maven.collector';
import parse = require("@xml-tools/parser");

describe('Maven pom.xml parser test', () => {
    const collector:PomXmlDependencyCollector = new PomXmlDependencyCollector();

    it('tests valid pom.xml', async () => {
        const deps = await collector.collect(
        `<dependencyManagement>
            <dependencies>
                <!-- Dependency with scope as runtime -->
                <dependency>
                    <groupId>{a.groupId}</groupId>
                    <artifactId>bc</artifactId>
                    <version>{a.version}</version>
                </dependency>

                <!-- Dependency with scope as runtime -->
                <dependency>
                    <groupId>b</groupId>
                    <artifactId>c-d</artifactId>
                    <version>1.2.3</version>
                    <scope>runtime</scope>
                </dependency>

                <!-- Dependency with scope as compile -->
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <scope>compile</scope>
                    <optional>true</optional>
                </dependency>

                <!-- Dependency with scope as test -->
                <dependency>
                    <groupId>d</groupId>
                    <artifactId>AB-CD</artifactId>
                    <version>3.4.5.6</version>
                    <scope>test</scope>
                    <optional>true</optional>
                </dependency>
            </dependencies>
         </dependencyManagement>
        `);
        expect(deps).is.eql([{
            name: {value: '{a.groupId}:bc', position: {line: 0, column: 0}},
            version: {value: '{a.version}', position: {line: 7, column: 30}}
        },{
            name: {value: 'b:c-d', position: {line: 0, column: 0}},
            version: {value: '1.2.3', position: {line: 14, column: 30}}
        },{
            name: {value: 'c:ab-cd', position: {line: 0, column: 0}},
            version: {value: '2.3', position: {line: 22, column: 30}}
        }]);
    });

    it('tests pom.xml without any scope', async () => {
        const deps = await collector.collect(
        `<dependencyManagement>
            <dependencies>
                <!-- Dependency with scope as runtime -->
                <dependency>
                    <groupId>{a.groupId}</groupId>
                    <artifactId>bc</artifactId>
                    <version>{a.version}</version>
                </dependency>

                <!-- Dependency with scope as runtime -->
                <dependency>
                    <groupId>b</groupId>
                    <artifactId>c-d</artifactId>
                    <version>1.2.3</version>
                </dependency>

                <!-- Dependency with scope as compile -->
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <optional>true</optional>
                </dependency>
            </dependencies>
         </dependencyManagement>
        `);
        expect(deps).is.eql([{
            name: {value: '{a.groupId}:bc', position: {line: 0, column: 0}},
            version: {value: '{a.version}', position: {line: 7, column: 30}}
        },{
            name: {value: 'b:c-d', position: {line: 0, column: 0}},
            version: {value: '1.2.3', position: {line: 14, column: 30}}
        },{
            name: {value: 'c:ab-cd', position: {line: 0, column: 0}},
            version: {value: '2.3', position: {line: 21, column: 30}}
        }]);
    });

    it('tests pom.xml with only test scope', async () => {
        const deps = await collector.collect(
        `<dependencyManagement>
            <dependencies>
                <!-- Dependency with scope as runtime -->
                <dependency>
                    <groupId>{a.groupId}</groupId>
                    <artifactId>bc</artifactId>
                    <version>{a.version}</version>
                    <scope>test</scope>
                </dependency>

                <!-- Dependency with scope as runtime -->
                <dependency>
                    <groupId>b</groupId>
                    <artifactId>c-d</artifactId>
                    <version>1.2.3</version>
                    <scope>test</scope>
                </dependency>

                <!-- Dependency with scope as compile -->
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <scope>test</scope>
                    <optional>true</optional>
                </dependency>
            </dependencies>
         </dependencyManagement>
        `);
        expect(deps.length).equal(0);
    });

    it('tests pom.xml with empty string', async () => {
        const deps = await collector.collect(
        `
        `);
        expect(deps.length).equal(0);
    });

    it('tests pom.xml with empty dependencyManagement', async () => {
        const deps = await collector.collect(
        `<dependencyManagement>
            
         </dependencyManagement>
        `);
        expect(deps.length).equal(0);
    });

    it('tests pom.xml with empty dependencyManagement + dependencies', async () => {
        const deps = await collector.collect(
        `<dependencyManagement>
            <dependencies>
      
            </dependencies>
         </dependencyManagement>
        `);
        expect(deps.length).equal(0);
    });

    it('tests pom.xml with invalid dependencies', async () => {
        const deps = await collector.collect(
        `
        <project>
         <dependencyManagement>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <scope>test</scope>
                    <optional>true</optional>
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
                    <version/>
                    <scope>bala</scope>
                </dependency>
            </dependencies>
         </dependencyManagement>
         </project>
        `);
        expect(deps).is.eql([{
          name: {value: 'foo:bar', position: {line: 0, column: 0}},
          version: {value: '2.4', position: {line: 15, column: 30}}
        }]);
    });

    it('tests pom.xml without dependencyManagement', async () => {
        const deps = await collector.collect(
        `
        <project>
            <dependencies>
                <dependency>
                    <groupId>c</groupId>
                    <artifactId>ab-cd</artifactId>
                    <version>2.3</version>
                    <scope>test</scope>
                    <optional>true</optional>
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
          version: {value: '2.4', position: {line: 14, column: 30}}
        }]);
    });

    it('tests pom.xml multiple dependencies', async () => {
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
            </dependencies>
         </project>
        `);
        expect(deps).is.eql([{
          name: {value: 'plugins:a', position: {line: 0, column: 0}},
          version: {value: '2.3', position: {line: 8, column: 34}}
        }, {
          name: {value: 'dep:a', position: {line: 0, column: 0}},
          version: {value: '10.1', position: {line: 16, column: 30}}
        }]);
    });

    it('tests pom.xml with properties', async () => {
        const deps = await collector.collect(
        `
        <project>
         <properties>
            <foo.dep.version>1.0</foo.dep.version>
            <bar.dep.version></bar.dep.version>
         </properties>
         <dependencyManagement>
            <dependencies>
                <dependency>
                    <groupId>foo</groupId>
                    <artifactId>foo-hello</artifactId>
                    <version>\$\{foo.dep.version\}</version>
                    <optional>true</optional>
                </dependency>
                <dependency>
                    <groupId>bar</groupId>
                    <artifactId>bar-hello</artifactId>
                    <version>\$\{bar.dep.version\}</version>
                    <optional>true</optional>
                </dependency>
            </dependencies>
         </dependencyManagement>
         </project>
        `);
        expect(deps).is.eql([{
          name: {value: 'foo:foo-hello', position: {line: 0, column: 0}},
          version: {value: '1.0', position: {line: 4, column: 30}}
        }, {
            name: {value: 'bar:bar-hello', position: {line: 0, column: 0}},
            // empty property won't be sustituted
            version: {value: '${bar.dep.version}', position: {line: 18, column: 30}}
        }]);
    });
});
