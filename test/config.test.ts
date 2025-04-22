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
    
    const rhdaConfig = {
        exhortSnykToken: 'mockToken',
        matchManifestVersions: false,
        usePythonVirtualEnvironment: true,
        useGoMVS: true,
        enablePythonBestEffortsInstallation: true,
        usePipDepTree: true,
        mvn: {
            executable: { path: 'mockPath' },
            preferWrapper: 'fallback'
        },
        gradle: {
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
        syft: {
            executable: { path: 'mockPath' },
            config: { path: 'mockPath' },
        },
        skopeo: {
            executable: { path: 'mockPath' },
            config: { path: 'mockPath' }
        },
        imagePlatform: 'mockPlatform',
        docker: {
            executable: { path: 'mockPath' }
        },
        podman: {
            executable: { path: 'mockPath' }
        },
        fallbacks: {
            useMavenWrapper: 'false'
        }
    };

    const partialRhdaConfig = {
        exhortSnykToken: 'mockToken',
        matchManifestVersions: true,
        usePythonVirtualEnvironment: false,
        useGoMVS: false,
        enablePythonBestEffortsInstallation: false,
        usePipDepTree: false,
        mvn: {
            executable: { path: '' },
            preferWrapper: ''
        },
        gradle: {
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
        syft: {
            executable: { path: '' },
            config: { path: '' },
        },
        skopeo: {
            executable: { path: '' },
            config: { path: '' }
        },
        imagePlatform: '',
        docker: {
            executable: { path: '' }
        },
        podman: {
            executable: { path: '' }
        },
        fallbacks: {
            useMavenWrapper: ''
        }
    };

    it('should initialize with default values when environment variables are not set', () => {
        expect(mockConfig.stackAnalysisCommand).to.eq('');
        expect(mockConfig.trackRecommendationAcceptanceCommand).to.eq('');
        expect(mockConfig.telemetryId).to.eq('');
        expect(mockConfig.utmSource).to.eq('');
        expect(mockConfig.exhortSnykToken).to.eq('');
        expect(mockConfig.matchManifestVersions).to.eq('true');
        expect(mockConfig.usePythonVirtualEnvironment).to.eq('false');
        expect(mockConfig.useGoMVS).to.eq('false');
        expect(mockConfig.enablePythonBestEffortsInstallation).to.eq('false');
        expect(mockConfig.usePipDepTree).to.eq('false');
        expect(mockConfig.exhortMvnPath).to.eq('mvn');
        expect(mockConfig.exhortGradlePath).to.eq('gradle');
        expect(mockConfig.exhortNpmPath).to.eq('npm');
        expect(mockConfig.exhortGoPath).to.eq('go');
        expect(mockConfig.exhortPython3Path).to.eq('python3');
        expect(mockConfig.exhortPip3Path).to.eq('pip3');
        expect(mockConfig.exhortPythonPath).to.eq('python');
        expect(mockConfig.exhortPipPath).to.eq('pip');
        expect(mockConfig.exhortSyftPath).to.eq('syft');
        expect(mockConfig.exhortSyftConfigPath).to.eq('');
        expect(mockConfig.exhortSkopeoPath).to.eq('skopeo');
        expect(mockConfig.exhortSkopeoConfigPath).to.eq('');
        expect(mockConfig.exhortDockerPath).to.eq('docker');
        expect(mockConfig.exhortPodmanPath).to.eq('podman');
        expect(mockConfig.exhortImagePlatform).to.eq('');
        expect(mockConfig.exhortPreferMvnw).to.eq('true')
    });
    
    it('should update configuration based on provided data', () => {

        mockConfig.updateConfig(rhdaConfig);

        expect(mockConfig.matchManifestVersions).to.eq('false');
        expect(mockConfig.usePythonVirtualEnvironment).to.eq('true');
        expect(mockConfig.useGoMVS).to.eq('true');
        expect(mockConfig.enablePythonBestEffortsInstallation).to.eq('true');
        expect(mockConfig.usePipDepTree).to.eq('true');
        expect(mockConfig.exhortMvnPath).to.eq('mockPath');
        expect(mockConfig.exhortGradlePath).to.eq('mockPath');
        expect(mockConfig.exhortNpmPath).to.eq('mockPath');
        expect(mockConfig.exhortGoPath).to.eq('mockPath');
        expect(mockConfig.exhortPython3Path).to.eq('mockPath');
        expect(mockConfig.exhortPip3Path).to.eq('mockPath');
        expect(mockConfig.exhortPythonPath).to.eq('mockPath');
        expect(mockConfig.exhortPipPath).to.eq('mockPath');   
        expect(mockConfig.exhortSyftPath).to.eq('mockPath');
        expect(mockConfig.exhortSyftConfigPath).to.eq('mockPath');
        expect(mockConfig.exhortSkopeoPath).to.eq('mockPath');
        expect(mockConfig.exhortSkopeoConfigPath).to.eq('mockPath');
        expect(mockConfig.exhortDockerPath).to.eq('mockPath');
        expect(mockConfig.exhortPodmanPath).to.eq('mockPath');
        expect(mockConfig.exhortImagePlatform).to.eq('mockPlatform');
        expect(mockConfig.exhortPreferMvnw).to.eq('false')
    });

    it('should update configuration based on provided partial data', () => {

        mockConfig.updateConfig(partialRhdaConfig);

        expect(mockConfig.matchManifestVersions).to.eq('true');
        expect(mockConfig.usePythonVirtualEnvironment).to.eq('false');
        expect(mockConfig.useGoMVS).to.eq('false');
        expect(mockConfig.enablePythonBestEffortsInstallation).to.eq('false');
        expect(mockConfig.usePipDepTree).to.eq('false');
        expect(mockConfig.exhortMvnPath).to.eq('mvn');
        expect(mockConfig.exhortGradlePath).to.eq('gradle');
        expect(mockConfig.exhortNpmPath).to.eq('npm');
        expect(mockConfig.exhortGoPath).to.eq('go');
        expect(mockConfig.exhortPython3Path).to.eq('python3');
        expect(mockConfig.exhortPip3Path).to.eq('pip3');
        expect(mockConfig.exhortPythonPath).to.eq('python');
        expect(mockConfig.exhortPipPath).to.eq('pip');    
        expect(mockConfig.exhortSyftPath).to.eq('syft');
        expect(mockConfig.exhortSyftConfigPath).to.eq('');
        expect(mockConfig.exhortSkopeoPath).to.eq('skopeo');
        expect(mockConfig.exhortSkopeoConfigPath).to.eq('');
        expect(mockConfig.exhortDockerPath).to.eq('docker');
        expect(mockConfig.exhortPodmanPath).to.eq('podman');
        expect(mockConfig.exhortImagePlatform).to.eq('');
        expect(mockConfig.exhortPreferMvnw).to.eq('true')
    });

    it('should set Exhort Snyk Token', () => {
        const mockToken = 'mockToken';

        expect(mockConfig.exhortSnykToken).to.not.eq(mockToken);  

        mockConfig.setExhortSnykToken(mockToken);

        expect(mockConfig.exhortSnykToken).to.eq(mockToken);    
    });
});