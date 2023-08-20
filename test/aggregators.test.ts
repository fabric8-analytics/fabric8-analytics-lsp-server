import { expect } from 'chai';
import { Diagnostic, DiagnosticSeverity, Range } from 'vscode-languageserver';
import { NoopVulnerabilityAggregator, MavenVulnerabilityAggregator } from '../src/aggregators';
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
}

const AnalyticsSource = '\nDependency Analytics Plugin [Powered by Snyk]';;

describe('Noop vulnerability aggregator tests', () => {

    it('Test Noop aggregator', async () => {
        let noopVulnerabilityAggregator = new NoopVulnerabilityAggregator();
        // let vulnerability = new Vulnerability(dummyRange, 0, 'pkg:npm/MockPkg@1.2.3', null, '', '', null, '');
        let vulnerability = new Vulnerability(dummyRange, 0, 'pkg:npm/MockPkg@1.2.3', '');
        let aggVulnerability = noopVulnerabilityAggregator.aggregate(vulnerability);

        // const msg = 'pkg:npm/MockPkg@1.2.3\nRecommendation: No RedHat packages to recommend';
        // let expectedDiagnostic: Diagnostic = {
        //     severity: DiagnosticSeverity.Information,
        //     range: dummyRange,
        //     message: msg,
        //     source: AnalyticsSource,
        // };

        expect(noopVulnerabilityAggregator.isNewVulnerability).to.equal(true);
        expect(aggVulnerability.ecosystem).is.eql('npm')
        // expect(aggVulnerability.getDiagnostic().toString().replace(/\s/g, "")).is.eql(expectedDiagnostic.toString().replace(/\s/g, ""));
    });
});

describe('Maven vulnerability aggregator tests', () => {

    it('Test Maven aggregator with one vulnerability', async () => {
        let mavenVulnerabilityAggregator = new MavenVulnerabilityAggregator();
        // let vulnerability = new Vulnerability(dummyRange, 0, 'pkg:maven/MockPkg@1.2.3', null, '', '', null, '');
        let vulnerability = new Vulnerability(dummyRange, 0, 'pkg:maven/MockPkg@1.2.3','');
        let aggVulnerability = mavenVulnerabilityAggregator.aggregate(vulnerability);

        // const msg = 'pkg:maven/MockPkg@1.2.3\nRecommendation: No RedHat packages to recommend';
        // let expectedDiagnostic: Diagnostic = {
        //     severity: DiagnosticSeverity.Information,
        //     range: dummyRange,
        //     message: msg,
        //     source: AnalyticsSource,
        // };

        expect(mavenVulnerabilityAggregator.isNewVulnerability).to.equal(true);
        expect(aggVulnerability.ecosystem).is.eql('maven')
        // expect(aggVulnerability.getDiagnostic().toString().replace(/\s/g, "")).is.eql(expectedDiagnostic.toString().replace(/\s/g, ""));
    });

    it('Test Maven aggregator with two identical vulnerability', async () => {
        let mavenVulnerabilityAggregator = new MavenVulnerabilityAggregator();
        // let vulnerability1 = new Vulnerability(dummyRange, 0, 'pkg:maven/MockPkg@1.2.3', null, '', '', null, '');
        let vulnerability1 = new Vulnerability(dummyRange, 0, 'pkg:maven/MockPkg@1.2.3', '');
        let aggVulnerability1 = mavenVulnerabilityAggregator.aggregate(vulnerability1);
        // let vulnerability2 = new Vulnerability(dummyRange, 0, 'pkg:maven/MockPkg@1.2.3', null, '', '', null, '');
        let vulnerability2 = new Vulnerability(dummyRange, 0, 'pkg:maven/MockPkg@1.2.3', '');
        let aggVulnerability2 = mavenVulnerabilityAggregator.aggregate(vulnerability2);

        expect(mavenVulnerabilityAggregator.isNewVulnerability).to.equal(false);
        expect(mavenVulnerabilityAggregator.vulnerabilities.size).to.equal(1);
        expect(aggVulnerability1.ecosystem).is.eql('maven')
        expect(aggVulnerability2.ecosystem).is.eql('maven')
    });

    it('Test Maven aggregator with two different vulnerability', async () => {
        let mavenVulnerabilityAggregator = new MavenVulnerabilityAggregator();
        // let vulnerability1 = new Vulnerability(dummyRange, 0, 'pkg:maven/MockPkg1@1.2.3', null, '', '', null, '');
        let vulnerability1 = new Vulnerability(dummyRange, 0, 'pkg:maven/MockPkg1@1.2.3', '');
        let aggVulnerability1 = mavenVulnerabilityAggregator.aggregate(vulnerability1);
        // let vulnerability2 = new Vulnerability(dummyRange, 0, 'pkg:maven/MockPkg2@1.2.3', null, '', '', null, '');
        let vulnerability2 = new Vulnerability(dummyRange, 0, 'pkg:maven/MockPkg2@1.2.3', '');
        let aggVulnerability2 = mavenVulnerabilityAggregator.aggregate(vulnerability2);

        expect(mavenVulnerabilityAggregator.isNewVulnerability).to.equal(true);
        expect(mavenVulnerabilityAggregator.vulnerabilities.size).to.equal(2);
        expect(aggVulnerability1.ecosystem).is.eql('maven')
        expect(aggVulnerability2.ecosystem).is.eql('maven')
    });
});