import { expect } from 'chai';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { Package } from '../src/package';

describe('Package tests', () => {
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

    it('Test package with minimal fields', async () => {
        let pckg = new Package("abc", "1.4.3", null, null, null, null, "low", null, dummyRange);

        const msg = "abc: 1.4.3\nKnown security vulnerability: 0\nSecurity advisory: 0\nExploits: unavailable\nHighest severity: low\nRecommendation: N/A";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test package with vulnerability', async () => {
        let pckg = new Package("abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);

        const msg = "abc: 1.4.3\nKnown security vulnerability: 2\nSecurity advisory: 1\nExploits: 1\nHighest severity: high\nRecommendation: 2.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test package without vulnerability', async () => {
        let pckg = new Package("abc", "1.4.3", 1, 0, 1, 1, "high", "2.3.1", dummyRange);

        const msg = "abc: 1.4.3\nKnown security vulnerability: 0\nSecurity advisory: 1\nExploits: 1\nHighest severity: high\nRecommendation: 2.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Information,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test package without vulnerability but without advisory', async () => {
        let pckg = new Package("abc", "1.4.3", 1, 0, 0, 1, "high", "2.3.1", dummyRange);

        const msg = "abc: 1.4.3\nKnown security vulnerability: 0\nSecurity advisory: 0\nExploits: 1\nHighest severity: high\nRecommendation: 2.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test package for golang ecosystem', async () => {
        let pckg = new Package("abc", "1.4.3", 1, 2, 1, 1, "high", "2.3.1", dummyRange);
        pckg.ecosystem = "golang"

        const msg = "abc: 1.4.3\nNumber of packages: 1\nKnown security vulnerability: 2\nSecurity advisory: 1\nExploits: 1\nHighest severity: high\nRecommendation: 2.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

    it('Test package for golang ecosystem with multiple packages', async () => {
        let pckg = new Package("abc", "1.4.3", 4, 2, 1, 1, "high", "2.3.1", dummyRange);
        pckg.ecosystem = "golang"

        const msg = "abc: 1.4.3\nNumber of packages: 4\nKnown security vulnerability: 2\nSecurity advisory: 1\nExploits: 1\nHighest severity: high\nRecommendation: 2.3.1";
        let expectedDiagnostic: Diagnostic = {
            severity: DiagnosticSeverity.Error,
            range: dummyRange,
            message: msg,
            source: '\nDependency Analytics Plugin [Powered by Snyk]',
        };

        expect(pckg.getDiagnostic()).is.eql(expectedDiagnostic);
    });

});
