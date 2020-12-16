import { expect } from 'chai';
import { SecurityEngine, DiagnosticsPipeline } from '../src/consumers';
import { NoopVulnerabilityAggregator, GolangVulnerabilityAggregator } from '../src/aggregators';

const config = {};
const diagnosticFilePath = "a/b/c/d";
const dependency = {
    "name": {
        "value" : "abc",
        "position": {
            "line": 20,
            "column": 6
        }
    },
    "version": {
        "value": "1.2.3",
        "position": {
            "line": 20,
            "column": 17
        }
    }
}

describe('Response consumer test', () => {
    it('Consume response for free-users', () => {
        let DiagnosticsEngines = [SecurityEngine];
        let diagnostics = [];
        let packageAggregator = new NoopVulnerabilityAggregator();
        const response = {
            "package_unknown": false,
            "package": "abc",
            "version": "1.2.3",
            "recommended_versions": "2.3.4",
            "registration_link": "https://abc.io/login",
            "vulnerability": [
                {
                    "id": "ABC-VULN",
                    "cvss": "9.8",
                    "is_private": true,
                    "cwes": [
                        "CWE-79"
                    ]
                }
            ],
            "message": "abc - 1.2.3 has 1 known security vulnerability and 1 security advisory with 1 having critical severity. Recommendation: use version 2.3.4. ",
            "highest_severity": "critical",
            "known_security_vulnerability_count": 1,
            "security_advisory_count": 1
        };

        let pipeline = new DiagnosticsPipeline(DiagnosticsEngines, dependency, config, diagnostics, packageAggregator, diagnosticFilePath);
        pipeline.run(response);
        const secEng = pipeline.items[0] as SecurityEngine;
        const msg = "abc: 1.2.3\nKnown security vulnerability: 1\nSecurity advisory: 1\nExploits: unavailable\nHighest severity: critical\nRecommendation: 2.3.4";

        expect(diagnostics.length).equal(1);
        expect(diagnostics[0].message).equal(msg);
        expect(secEng.vulnerabilityCount).equal(1);
        expect(secEng.advisoryCount).equal(1);
        expect(secEng.exploitCount).equal(null);
    });

    it('Consume response for registered-users', () => {
        let DiagnosticsEngines = [SecurityEngine];
        let diagnostics = [];
        let packageAggregator = new NoopVulnerabilityAggregator();
        const response = {
            "package_unknown": false,
            "package": "abc",
            "version": "1.2.3",
            "recommended_versions": "2.3.4",
            "registration_link": "https://abc.io/login",
            "vulnerability": [
                {
                    "id": "ABC-VULN",
                    "cvss": "9.8",
                    "is_private": true,
                    "cwes": [
                        "CWE-79"
                    ]
                }
            ],
            "message": "abc - 1.2.3 has 1 known security vulnerability and 1 security advisory with 1 exploitable vulnerability. Recommendation: use version 2.3.4. ",
            "highest_severity": "critical",
            "known_security_vulnerability_count": 1,
            "security_advisory_count": 1,
            "exploitable_vulnerabilities_count": 1
        };

        let pipeline = new DiagnosticsPipeline(DiagnosticsEngines, dependency, config, diagnostics, packageAggregator, diagnosticFilePath);
        pipeline.run(response);
        const secEng = pipeline.items[0] as SecurityEngine;
        const msg = "abc: 1.2.3\nKnown security vulnerability: 1\nSecurity advisory: 1\nExploits: 1\nHighest severity: critical\nRecommendation: 2.3.4";

        expect(diagnostics.length).equal(1);
        expect(diagnostics[0].message).equal(msg);
        expect(secEng.vulnerabilityCount).equal(1);
        expect(secEng.advisoryCount).equal(1);
        expect(secEng.exploitCount).equal(1);
    });

    it('Consume response for multiple packages', () => {
        let DiagnosticsEngines = [SecurityEngine];
        let diagnostics = [];
        let packageAggregator = new GolangVulnerabilityAggregator();
        var response = {
            "package_unknown": false,
            "package": "github.com/abc",
            "version": "1.2.3",
            "recommended_versions": "2.3.4",
            "registration_link": "https://abc.io/login",
            "vulnerability": [
                {
                    "id": "ABC-VULN",
                    "cvss": "9.8",
                    "is_private": true,
                    "cwes": [
                        "CWE-79"
                    ]
                }
            ],
            "message": "github.com/abc - 1.2.3 has 1 known security vulnerability and 1 security advisory with 1 exploitable vulnerability. Recommendation: use version 2.3.4. ",
            "highest_severity": "critical",
            "known_security_vulnerability_count": 1,
            "security_advisory_count": 1,
            "exploitable_vulnerabilities_count": 1
        };

        let pipeline = new DiagnosticsPipeline(DiagnosticsEngines, dependency, config, diagnostics, packageAggregator, diagnosticFilePath);
        pipeline.run(response);
        var secEng = pipeline.items[0] as SecurityEngine;
        var msg = "github.com/abc: 1.2.3\nNumber of packages: 1\nKnown security vulnerability: 1\nSecurity advisory: 1\nExploits: 1\nHighest severity: critical\nRecommendation: 2.3.4";

        expect(diagnostics.length).equal(1);
        expect(diagnostics[0].message).equal(msg);
        expect(secEng.vulnerabilityCount).equal(1);
        expect(secEng.advisoryCount).equal(1);
        expect(secEng.exploitCount).equal(1);

        response = {
            "package_unknown": false,
            "package": "github.com/abc/pck1@github.com/abc",
            "version": "1.2.3",
            "recommended_versions": "2.6.4",
            "registration_link": "https://abc.io/login",
            "vulnerability": [
                {
                    "id": "ABC-VULN",
                    "cvss": "9.8",
                    "is_private": true,
                    "cwes": [
                        "CWE-79"
                    ]
                }
            ],
            "message": "github.com/abc/pck1 - 1.2.3 has 1 known security vulnerability and 1 security advisory with 1 exploitable vulnerability. Recommendation: use version 2.3.4. ",
            "highest_severity": "high",
            "known_security_vulnerability_count": 3,
            "security_advisory_count": 2,
            "exploitable_vulnerabilities_count": 1
        };

        pipeline.run(response);
        secEng = pipeline.items[0] as SecurityEngine;
        msg = "github.com/abc: 1.2.3\nNumber of packages: 2\nKnown security vulnerability: 4\nSecurity advisory: 3\nExploits: 2\nHighest severity: critical\nRecommendation: 2.6.4";

        expect(diagnostics.length).equal(1);
        expect(diagnostics[0].message).equal(msg);
    });

    it('Consume response for free-users with only security advisories', () => {
        let DiagnosticsEngines = [SecurityEngine];
        let diagnostics = [];
        let packageAggregator = new NoopVulnerabilityAggregator();
        const response = {
            "package_unknown": false,
            "package": "abc",
            "version": "1.2.3",
            "recommended_versions": "N/A",
            "registration_link": "https://abc.io/login",
            "vulnerability": [
                {
                    "id": "ABC-VULN",
                    "cvss": "9.8",
                    "is_private": true,
                    "cwes": [
                        "CWE-79"
                    ]
                }
            ],
            "message": "abc - 1.2.3 has 1 security advisory. ",
            "highest_severity": "critical",
            "known_security_vulnerability_count": 0,
            "security_advisory_count": 1
        };

        let pipeline = new DiagnosticsPipeline(DiagnosticsEngines, dependency, config, diagnostics, packageAggregator, diagnosticFilePath);
        pipeline.run(response);
        const secEng = pipeline.items[0] as SecurityEngine;
        const msg = "abc: 1.2.3\nKnown security vulnerability: 0\nSecurity advisory: 1\nExploits: unavailable\nHighest severity: critical\nRecommendation: N/A";

        expect(diagnostics.length).equal(1);
        expect(diagnostics[0].message).equal(msg);
        expect(secEng.vulnerabilityCount).equal(0);
        expect(secEng.advisoryCount).equal(1);
        expect(secEng.exploitCount).equal(null);
    });

    it('Consume response without vulnerability', () => {
        let DiagnosticsEngines = [SecurityEngine];
        let diagnostics = [];
        let packageAggregator = new NoopVulnerabilityAggregator();
        const response = {
            "package": "lodash",
            "version": "4.17.20",
            "package_unknown": false,
            "recommendation": {}
        }

        let pipeline = new DiagnosticsPipeline(DiagnosticsEngines, dependency, config, diagnostics, packageAggregator, diagnosticFilePath);
        pipeline.run(response);
        const secEng = pipeline.items[0] as SecurityEngine;

        expect(diagnostics.length).equal(0);
        expect(secEng.vulnerabilityCount).equal(null);
        expect(secEng.advisoryCount).equal(null);
        expect(secEng.exploitCount).equal(null);
    });

    it('Consume invalid response', () => {
        let DiagnosticsEngines = [SecurityEngine];
        let diagnostics = [];
        let packageAggregator = new NoopVulnerabilityAggregator();
        const response = {
            "package_unknown": false,
            "package": "abc",
            "version": "1.2.3",
            "recommended_versions": "2.3.4",
            "registration_link": "https://abc.io/login",
            "vulnerability": [],
            "message": "abc - 1.2.3 has 1 security advisory. Recommendation: use version 2.3.4. ",
            "highest_severity": "critical",
            "known_security_vulnerability_count": 0,
            "security_advisory_count": 1
        };

        let pipeline = new DiagnosticsPipeline(DiagnosticsEngines, dependency, config, diagnostics, packageAggregator, diagnosticFilePath);
        pipeline.run(response);

        expect(diagnostics.length).equal(0);
    });
});
