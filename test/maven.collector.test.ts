import { expect } from 'chai';
import { PomXmlDependencyCollector } from '../src/collector';

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
        expect(deps.length).equal(3);
        expect(deps[0]).is.eql({
          name: {value: '{a.groupId}:bc', position: {line: 0, column: 0}},
          version: {value: '{a.version}', position: {line: 7, column: 30}},
          parent: null,
        });
        expect(deps[1]).is.eql({
          name: {value: 'b:c-d', position: {line: 0, column: 0}},
          version: {value: '1.2.3', position: {line: 14, column: 30}},
          parent: null,
        });
        expect(deps[2]).is.eql({
          name: {value: 'c:ab-cd', position: {line: 0, column: 0}},
          version: {value: '2.3', position: {line: 22, column: 30}},
          parent: null,
        });
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
        expect(deps.length).equal(3);
        expect(deps[0]).is.eql({
          name: {value: '{a.groupId}:bc', position: {line: 0, column: 0}},
          version: {value: '{a.version}', position: {line: 7, column: 30}},
          parent: null,
        });
        expect(deps[1]).is.eql({
          name: {value: 'b:c-d', position: {line: 0, column: 0}},
          version: {value: '1.2.3', position: {line: 14, column: 30}},
          parent: null,
        });
        expect(deps[2]).is.eql({
          name: {value: 'c:ab-cd', position: {line: 0, column: 0}},
          version: {value: '2.3', position: {line: 21, column: 30}},
          parent: null,
        });
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
});
