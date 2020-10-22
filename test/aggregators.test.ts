import { expect } from 'chai';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { PackageAggregator, GolangPackageAggregator, NoopPackageAggregator } from '../src/aggregators';
import { Package } from '../src/package';

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

describe('Package aggregator tests', () => {
    it('Base aggregator test', async () => {
        let pckg = new Package("abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        let packageAggregator = new PackageAggregator("cool")
        pckg = packageAggregator.aggregate(pckg)

        expect(pckg).is.eql(null);
        expect(packageAggregator.ecosystem).is.eql("cool")
    });
});

describe('Noop package aggregator tests', () => {

    it('Test noop aggregator with one package', async () => {
        let pckg = new Package("abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        let noopPackageAggregator = new NoopPackageAggregator()
        pckg = noopPackageAggregator.aggregate(pckg)

        const msg = "abc: 1.4.3\nKnown security vulnerability: 2\nSecurity advisory: 1\nExploits: 1\nHighest severity: high\nRecommendation: 2.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test noop aggregator with two package', async () => {
        let pckg1 = new Package("abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        let noopPackageAggregator = new NoopPackageAggregator()
        var pckg = noopPackageAggregator.aggregate(pckg1)

        let pckg2 = new Package("abc/pck", "2.4.3", 1, 3, 2, 2, "low", "3.3.1", dummyRange);
        pckg = noopPackageAggregator.aggregate(pckg2)

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

describe('Golang package aggregator tests', () => {
    it('Test golang aggregator with one package', async () => {
        let pckg = new Package("abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        let golangPackageAggregator = new GolangPackageAggregator()
        pckg = golangPackageAggregator.aggregate(pckg)

        const msg = "abc: 1.4.3\nNumber of packages: 1\nKnown security vulnerability: 2\nSecurity advisory: 1\nExploits: 1\nHighest severity: high\nRecommendation: 2.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test golang aggregator with two package', async () => {
        let pckg1 = new Package("abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        let golangPackageAggregator = new GolangPackageAggregator()
        var pckg = golangPackageAggregator.aggregate(pckg1)

        let pckg2 = new Package("abc/pck1", "1.4.3", 1, 3, 2, 2, "low", "3.3.1", dummyRange);
        pckg = golangPackageAggregator.aggregate(pckg2)

        const msg = "abc: 1.4.3\nNumber of packages: 2\nKnown security vulnerability: 5\nSecurity advisory: 3\nExploits: 3\nHighest severity: high\nRecommendation: 3.3.1";
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
        let pckg1 = new Package("abc", "1.4.3", 1, 2, 1, 1, "low", "", dummyRange);
        let golangPackageAggregator = new GolangPackageAggregator()
        var pckg = golangPackageAggregator.aggregate(pckg1)

        let pckg2 = new Package("abc/pck1", "1.4.3", 1, 3, 2, 2, "low", "3.3.1", dummyRange);
        pckg = golangPackageAggregator.aggregate(pckg2)

        const msg = "abc: 1.4.3\nNumber of packages: 2\nKnown security vulnerability: 5\nSecurity advisory: 3\nExploits: 3\nHighest severity: low\nRecommendation: 3.3.1";
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
        let pckg1 = new Package("abc", "1.4.3", 1, 2, 1, 1, "medium", null, dummyRange);
        let golangPackageAggregator = new GolangPackageAggregator()
        var pckg = golangPackageAggregator.aggregate(pckg1)

        let pckg2 = new Package("abc/pck1", "1.4.3", 1, 3, 2, 2, "low", "3.3.1", dummyRange);
        pckg = golangPackageAggregator.aggregate(pckg2)

        const msg = "abc: 1.4.3\nNumber of packages: 2\nKnown security vulnerability: 5\nSecurity advisory: 3\nExploits: 3\nHighest severity: medium\nRecommendation: 3.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        // Golang should aggregate both data togather.
        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test golang aggregator for package and module response out of order', async () => {
        let pckg1 = new Package("abc/pck3", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        let golangPackageAggregator = new GolangPackageAggregator()
        var pckg = golangPackageAggregator.aggregate(pckg1)

        let pckg2 = new Package("abc", "1.4.3", 1, 3, 2, 2, "critical", "3.3.1", dummyRange);
        pckg = golangPackageAggregator.aggregate(pckg2)

        const msg = "abc: 1.4.3\nNumber of packages: 2\nKnown security vulnerability: 5\nSecurity advisory: 3\nExploits: 3\nHighest severity: critical\nRecommendation: 3.3.1";
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
