import { expect } from 'chai';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { GolangVulnerabilityAggregator, NoopVulnerabilityAggregator } from '../src/aggregators';
import { Vulnerability } from '../src/vulnerability';

const dummyRange: Range = {
    start: {
        line: 3,
        character: 4
    },
    end: {
        line: 3,
        character: 10
    }
};

describe('Noop vulnerability aggregator tests', () => {

    it('Test noop aggregator with one vulnerability', async () => {
        let pckg = new Vulnerability("abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        let noopVulnerabilityAggregator = new NoopVulnerabilityAggregator();
        pckg = noopVulnerabilityAggregator.aggregate(pckg);

        const msg = "abc: 1.4.3\nKnown security vulnerability: 2\nSecurity advisory: 1\nExploits: 1\nHighest severity: high\nRecommendation: 2.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test noop aggregator with two vulnerability', async () => {
        let pckg1 = new Vulnerability("abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        let noopVulnerabilityAggregator = new NoopVulnerabilityAggregator();
        var pckg = noopVulnerabilityAggregator.aggregate(pckg1);

        let pckg2 = new Vulnerability("abc/pck", "2.4.3", 1, 3, 2, 2, "low", "3.3.1", dummyRange);
        pckg = noopVulnerabilityAggregator.aggregate(pckg2);

        const msg = "abc/pck: 2.4.3\nKnown security vulnerability: 3\nSecurity advisory: 2\nExploits: 2\nHighest severity: low\nRecommendation: 3.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        // Noop should not aggregate any data, it should be same as PCKG2
        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });
});

describe('Golang vulnerability aggregator tests', () => {
    it('Test golang aggregator with one vulnerability', async () => {
        let pckg = new Vulnerability("github.com/abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        let golangVulnerabilityAggregator = new GolangVulnerabilityAggregator();
        pckg = golangVulnerabilityAggregator.aggregate(pckg);

        const msg = "github.com/abc: 1.4.3\nNumber of packages: 1\nKnown security vulnerability: 2\nSecurity advisory: 1\nExploits: 1\nHighest severity: high\nRecommendation: 2.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test golang aggregator with two vulnerability', async () => {
        let pckg1 = new Vulnerability("github.com/abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        let golangVulnerabilityAggregator = new GolangVulnerabilityAggregator();
        var pckg = golangVulnerabilityAggregator.aggregate(pckg1);

        let pckg2 = new Vulnerability("github.com/abc/pck1@github.com/abc", "1.4.3", 1, 3, 2, 2, "low", "3.3.1", dummyRange);
        pckg = golangVulnerabilityAggregator.aggregate(pckg2);

        const msg = "github.com/abc: 1.4.3\nNumber of packages: 2\nKnown security vulnerability: 5\nSecurity advisory: 3\nExploits: 3\nHighest severity: high\nRecommendation: 3.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        // Golang should aggregate both data togather.
        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test golang aggregator with empty old rec version', async () => {
        let pckg1 = new Vulnerability("github.com/abc", "1.4.3", 1, 2, 1, 1, "low", "", dummyRange);
        let golangVulnerabilityAggregator = new GolangVulnerabilityAggregator();
        var pckg = golangVulnerabilityAggregator.aggregate(pckg1);

        let pckg2 = new Vulnerability("github.com/abc/pck1@github.com/abc", "1.4.3", 1, 3, 2, 2, "low", "3.3.1", dummyRange);
        pckg = golangVulnerabilityAggregator.aggregate(pckg2);

        const msg = "github.com/abc: 1.4.3\nNumber of packages: 2\nKnown security vulnerability: 5\nSecurity advisory: 3\nExploits: 3\nHighest severity: low\nRecommendation: 3.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        // Golang should aggregate both data togather.
        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test golang aggregator with null old rec version', async () => {
        let pckg1 = new Vulnerability("github.com/abc", "1.4.3", 1, 2, 1, 1, "medium", null, dummyRange);
        let golangVulnerabilityAggregator = new GolangVulnerabilityAggregator();
        var pckg = golangVulnerabilityAggregator.aggregate(pckg1);

        let pckg2 = new Vulnerability("github.com/abc/pck1@github.com/abc", "1.4.3", 1, 3, 2, 2, "low", "3.3.1", dummyRange);
        pckg = golangVulnerabilityAggregator.aggregate(pckg2);

        const msg = "github.com/abc: 1.4.3\nNumber of packages: 2\nKnown security vulnerability: 5\nSecurity advisory: 3\nExploits: 3\nHighest severity: medium\nRecommendation: 3.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        // Golang should aggregate both data togather.
        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test golang aggregator for vulnerability and module response out of order', async () => {
        let pckg1 = new Vulnerability("github.com/abc/pck1@github.com/abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        let golangVulnerabilityAggregator = new GolangVulnerabilityAggregator();
        var pckg = golangVulnerabilityAggregator.aggregate(pckg1);

        let pckg2 = new Vulnerability("github.com/abc", "1.4.3", 1, 3, 2, 2, "critical", "3.3.1", dummyRange);
        pckg = golangVulnerabilityAggregator.aggregate(pckg2);

        const msg = "github.com/abc: 1.4.3\nNumber of packages: 2\nKnown security vulnerability: 5\nSecurity advisory: 3\nExploits: 3\nHighest severity: critical\nRecommendation: 3.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        // Golang should aggregate both data togather.
        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test golang aggregator with first package has null values', async () => {
        let pckg1 = new Vulnerability("github.com/abc", "1.4.3", 1, null, null, null, "high", null, dummyRange);
        let golangVulnerabilityAggregator = new GolangVulnerabilityAggregator();
        var pckg = golangVulnerabilityAggregator.aggregate(pckg1);

        let pckg2 = new Vulnerability("github.com/abc/pck1@github.com/abc", "1.4.3", 1, 3, 2, 2, "low", "1.6.1", dummyRange);
        pckg = golangVulnerabilityAggregator.aggregate(pckg2);

        const msg = "github.com/abc: 1.4.3\nNumber of packages: 2\nKnown security vulnerability: 3\nSecurity advisory: 2\nExploits: 2\nHighest severity: high\nRecommendation: 1.6.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        // Golang should aggregate both data togather.
        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test golang aggregator with second package has null values', async () => {
        let pckg1 = new Vulnerability("github.com/abc", "1.4.3", 1, 3, 2, 2, "low", "1.6.1", dummyRange);
        let golangVulnerabilityAggregator = new GolangVulnerabilityAggregator();
        var pckg = golangVulnerabilityAggregator.aggregate(pckg1);

        let pckg2 = new Vulnerability("github.com/abc/pck1@github.com/abc", "1.4.3", 1, null, null, null, "high", null, dummyRange);
        pckg = golangVulnerabilityAggregator.aggregate(pckg2);

        const msg = "github.com/abc: 1.4.3\nNumber of packages: 2\nKnown security vulnerability: 3\nSecurity advisory: 2\nExploits: 2\nHighest severity: high\nRecommendation: 1.6.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        // Golang should aggregate both data togather.
        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

});
