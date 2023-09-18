import { expect } from 'chai';
import { DependencyProvider as PackageJson } from '../src/providers/package.json';
import { SecurityEngine, DiagnosticsPipeline } from '../src/consumers';
import { NoopVulnerabilityAggregator } from '../src/aggregators';
import { Diagnostic } from 'vscode-languageserver';

const config = {};
const diagnosticFilePath = "path/to/mock/diagnostic";
const pkg = {
  name: {
    value: "MockPkg",
    position: {
      line: 20,
      column: 6
    }
  },
  version: {
    value: "1.2.3",
    position: {
      line: 20,
      column: 17
    }
  },
  context: {
    value: "MockPkg1.2.3",
    range: {
        start: {
            line: 20,
            character: 6
        },
        end: {
            line: 20,
            character:17
        }
    }
  }
};

describe('Response consumer test', () => {
    it('Consume response without vulnerabilities', () => {
        let diagnostics: Diagnostic[] = [];
        let packageAggregator = new NoopVulnerabilityAggregator(new PackageJson());
        const dependency = {
            ref: "pkg:npm/MockPkg@1.2.3",
            issues: [
            ],
            transitive: [
            ],
            recommendation: {
                name: 'mockRecommendationName',
                version: 'mockRecommendationVersion',
            },
            remediations: {
            },
            highestVulnerability: {
            },
          }

        let pipeline = new DiagnosticsPipeline(SecurityEngine, pkg, config, diagnostics, packageAggregator, diagnosticFilePath);
        pipeline.run(dependency);
        const secEng = pipeline.item as SecurityEngine;
        // const msg = 'MockPkg@1.2.3\nRecommendation: mockRecommendationName:mockRecommendationVersion';

        // expect(diagnostics.length).equal(1);
        expect(diagnostics.length).equal(0);
        expect(secEng.issuesCount).equal(0);
        // expect(diagnostics[0].message.toString().replace(/\s/g, "")).equal(msg.toString().replace(/\s/g, ""));
    });

    it('Consume response with vulnerabilities', () => {
        let diagnostics: Diagnostic[] = [];
        let packageAggregator = new NoopVulnerabilityAggregator(new PackageJson());
        const dependency = {
            ref: "pkg:npm/MockPkg@1.2.3",
            issues: [
              {
                id: "MockIssue",
              },
            ],
            transitive: [
            ],
            recommendation: null,
            remediations: {
              "mockCVE": {
                npmPackage: "pkg:npm/MockPkg@4.5.6",
              },
            },
            highestVulnerability: {
              id: "MockIssue",
              severity: "MockSeverity",
            },
          }

        let pipeline = new DiagnosticsPipeline(SecurityEngine, pkg, config, diagnostics, packageAggregator, diagnosticFilePath);
        pipeline.run(dependency);
        const secEng = pipeline.item as SecurityEngine;
        // const msg = "MockPkg@1.2.3\nKnown security vulnerabilities: 1\nHighest severity: MockSeverity\nHas remediation: Yes";
        const msg = "MockPkg@1.2.3\nKnown security vulnerabilities: 1\nHighest severity: MockSeverity";

        expect(diagnostics.length).equal(1);
        expect(secEng.issuesCount).equal(1);
        expect(diagnostics[0].message.toString().replace(/\s/g, "")).equal(msg.toString().replace(/\s/g, ""));
    });

    it('Consume invalid response', () => {
        let diagnostics: Diagnostic[] = [];
        let packageAggregator = new NoopVulnerabilityAggregator(new PackageJson());
        const dependency = {
            ref: "pkg:npm/MockPkg@1.2.3",
        };

        let pipeline = new DiagnosticsPipeline(SecurityEngine, pkg, config, diagnostics, packageAggregator, diagnosticFilePath);
        pipeline.run(dependency);

        expect(diagnostics.length).equal(0);
    });
});
