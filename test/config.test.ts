'use strict';

import { expect } from 'chai';

import { globalConfig } from '../src/config';

describe('Config tests', () => {

    const mockConfig = globalConfig;

    before(() => {
      Object.keys(process.env).forEach(k => {
        delete process.env[k];
      });
      mockConfig.load();
    });
    
    const rhdaData = {
        exhortSnykToken: 'mockToken',
        matchManifestVersions: false,
        mvn: {
            executable: { path: 'mockPath' }
        },
        npm: {
            executable: { path: 'mockPath' }
        },
        go: {
            executable: { path: 'mockPath' }
        },
        python3: {
            executable: { path: 'mockPath' }
        },
        pip3: {
            executable: { path: 'mockPath' }
        },
        python: {
            executable: { path: 'mockPath' }
        },
        pip: {
            executable: { path: 'mockPath' }
        },
    };

    const partialRhdaData = {
        exhortSnykToken: 'mockToken',
        matchManifestVersions: true,
        mvn: {
        executable: { path: '' }
        },
        npm: {
        executable: { path: '' }
        },
        go: {
        executable: { path: '' }
        },
        python3: {
        executable: { path: '' }
        },
        pip3: {
        executable: { path: '' }
        },
        python: {
        executable: { path: '' }
        },
        pip: {
        executable: { path: '' }
        },
    };

    it('should initialize with default values when environment variables are not set', () => {
        expect(mockConfig.stackAnalysisCommand).to.eq('');
        expect(mockConfig.rhRepositoryRecommendationNotificationCommand).to.eq('');
        expect(mockConfig.telemetryId).to.eq('');
        expect(mockConfig.utmSource).to.eq('');
        expect(mockConfig.exhortSnykToken).to.eq('');
        expect(mockConfig.matchManifestVersions).to.eq('true');
        expect(mockConfig.exhortMvnPath).to.eq('mvn');
        expect(mockConfig.exhortNpmPath).to.eq('npm');
        expect(mockConfig.exhortGoPath).to.eq('go');
        expect(mockConfig.exhortPython3Path).to.eq('python3');
        expect(mockConfig.exhortPip3Path).to.eq('pip3');
        expect(mockConfig.exhortPythonPath).to.eq('python');
        expect(mockConfig.exhortPipPath).to.eq('pip');
    });
    
    it('should update configuration based on provided data', () => {

        mockConfig.updateConfig(rhdaData);

        expect(mockConfig.matchManifestVersions).to.eq('false');
        expect(mockConfig.exhortMvnPath).to.eq('mockPath');
        expect(mockConfig.exhortNpmPath).to.eq('mockPath');
        expect(mockConfig.exhortGoPath).to.eq('mockPath');
        expect(mockConfig.exhortPython3Path).to.eq('mockPath');
        expect(mockConfig.exhortPip3Path).to.eq('mockPath');
        expect(mockConfig.exhortPythonPath).to.eq('mockPath');
        expect(mockConfig.exhortPipPath).to.eq('mockPath');        
    });

    it('should update configuration based on provided partial data', () => {

        mockConfig.updateConfig(partialRhdaData);

        expect(mockConfig.matchManifestVersions).to.eq('true');
        expect(mockConfig.exhortMvnPath).to.eq('mvn');
        expect(mockConfig.exhortNpmPath).to.eq('npm');
        expect(mockConfig.exhortGoPath).to.eq('go');
        expect(mockConfig.exhortPython3Path).to.eq('python3');
        expect(mockConfig.exhortPip3Path).to.eq('pip3');
        expect(mockConfig.exhortPythonPath).to.eq('python');
        expect(mockConfig.exhortPipPath).to.eq('pip');        
    });

    it('should set Exhort Snyk Token', () => {
        const mockToken = 'mockToken';

        expect(mockConfig.exhortSnykToken).to.not.eq(mockToken);  

        mockConfig.setExhortSnykToken(mockToken);

        expect(mockConfig.exhortSnykToken).to.eq(mockToken);    
    });
});