'use strict';

import { expect } from 'chai';

import { Config } from '../src/config';

describe('Config tests', () => {

    const mockConfig = new Config();

    const data = {
        redHatDependencyAnalytics: {
          exhortSnykToken: 'mockToken',
          exhortOSSIndexUser: 'mockUser',
          exhortOSSIndexToken: 'mockToken',
          matchManifestVersions: false
        },
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

    it('should initialize with default values when environment variables are not set', () => {
        expect(mockConfig.triggerFullStackAnalysis).to.eq('');
        expect(mockConfig.telemetryId).to.eq('');
        expect(mockConfig.utmSource).to.eq('');
        expect(mockConfig.exhortSnykToken).to.eq('');
        expect(mockConfig.exhortOSSIndexUser).to.eq('');
        expect(mockConfig.exhortOSSIndexToken).to.eq('');
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

        mockConfig.updateConfig(data);

        expect(mockConfig.exhortSnykToken).to.eq('mockToken');
        expect(mockConfig.exhortOSSIndexUser).to.eq('mockUser');
        expect(mockConfig.exhortOSSIndexToken).to.eq('mockToken');
        expect(mockConfig.matchManifestVersions).to.eq('false');
        expect(mockConfig.exhortMvnPath).to.eq('mockPath');
        expect(mockConfig.exhortNpmPath).to.eq('mockPath');
        expect(mockConfig.exhortGoPath).to.eq('mockPath');
        expect(mockConfig.exhortPython3Path).to.eq('mockPath');
        expect(mockConfig.exhortPip3Path).to.eq('mockPath');
        expect(mockConfig.exhortPythonPath).to.eq('mockPath');
        expect(mockConfig.exhortPipPath).to.eq('mockPath');        
    });
});