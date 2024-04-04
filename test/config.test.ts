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
            imageSource: 'mockSource'
        },
        skopeo: {
            executable: { path: 'mockPath' },
            config: { path: 'mockPath' }
        },
        image: {
            serviceEndpoint: 'mockServiceEndpoint',
            platform: 'mockPlatform',
            OS: 'mockOS',
            arch: 'mockArch',
            variant: 'mockVariant'
        }, 
        docker: {
            executable: { path: 'mockPath' }
        },
        podman: {
            executable: { path: 'mockPath' }
        },   
    };

    const partialRhdaConfig = {
        exhortSnykToken: 'mockToken',
        matchManifestVersions: true,
        usePythonVirtualEnvironment: false,
        useGoMVS: false,
        enablePythonBestEffortsInstallation: false,
        usePipDepTree: false,
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
        syft: {
            executable: { path: '' },
            config: { path: '' },
            imageSource: ''
        },
        skopeo: {
            executable: { path: '' },
            config: { path: '' }
        },
        image: {
            serviceEndpoint: '',
            platform: '',
            OS: '',
            arch: '',
            variant: ''
        }, 
        docker: {
            executable: { path: '' }
        },
        podman: {
            executable: { path: '' }
        },
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
        expect(mockConfig.exhortNpmPath).to.eq('npm');
        expect(mockConfig.exhortGoPath).to.eq('go');
        expect(mockConfig.exhortPython3Path).to.eq('python3');
        expect(mockConfig.exhortPip3Path).to.eq('pip3');
        expect(mockConfig.exhortPythonPath).to.eq('python');
        expect(mockConfig.exhortPipPath).to.eq('pip');
        expect(mockConfig.exhortSyftPath).to.eq('syft');
        expect(mockConfig.exhortSyftConfigPath).to.eq('');
        expect(mockConfig.exhortSyftImageSource).to.eq('');
        expect(mockConfig.exhortSkopeoPath).to.eq('skopeo');
        expect(mockConfig.exhortSkopeoConfigPath).to.eq('');
        expect(mockConfig.exhortImageServiceEndpoint).to.eq('');
        expect(mockConfig.exhortDockerPath).to.eq('docker');
        expect(mockConfig.exhortPodmanPath).to.eq('podman');
        expect(mockConfig.exhortImagePlatform).to.eq('');
        expect(mockConfig.exhortImageOS).to.eq('');
        expect(mockConfig.exhortImageArch).to.eq('');
        expect(mockConfig.exhortImageVariant).to.eq('');
    });
    
    it('should update configuration based on provided data', () => {

        mockConfig.updateConfig(rhdaConfig);

        expect(mockConfig.matchManifestVersions).to.eq('false');
        expect(mockConfig.usePythonVirtualEnvironment).to.eq('true');
        expect(mockConfig.useGoMVS).to.eq('true');
        expect(mockConfig.enablePythonBestEffortsInstallation).to.eq('true');
        expect(mockConfig.usePipDepTree).to.eq('true');
        expect(mockConfig.exhortMvnPath).to.eq('mockPath');
        expect(mockConfig.exhortNpmPath).to.eq('mockPath');
        expect(mockConfig.exhortGoPath).to.eq('mockPath');
        expect(mockConfig.exhortPython3Path).to.eq('mockPath');
        expect(mockConfig.exhortPip3Path).to.eq('mockPath');
        expect(mockConfig.exhortPythonPath).to.eq('mockPath');
        expect(mockConfig.exhortPipPath).to.eq('mockPath');   
        expect(mockConfig.exhortSyftPath).to.eq('mockPath');
        expect(mockConfig.exhortSyftConfigPath).to.eq('mockPath');
        expect(mockConfig.exhortSyftImageSource).to.eq('mockSource');
        expect(mockConfig.exhortSkopeoPath).to.eq('mockPath');
        expect(mockConfig.exhortSkopeoConfigPath).to.eq('mockPath');
        expect(mockConfig.exhortImageServiceEndpoint).to.eq('mockServiceEndpoint');
        expect(mockConfig.exhortDockerPath).to.eq('mockPath');
        expect(mockConfig.exhortPodmanPath).to.eq('mockPath');
        expect(mockConfig.exhortImagePlatform).to.eq('mockPlatform');
        expect(mockConfig.exhortImageOS).to.eq('mockOS');
        expect(mockConfig.exhortImageArch).to.eq('mockArch');
        expect(mockConfig.exhortImageVariant).to.eq('mockVariant');     
    });

    it('should update configuration based on provided partial data', () => {

        mockConfig.updateConfig(partialRhdaConfig);

        expect(mockConfig.matchManifestVersions).to.eq('true');
        expect(mockConfig.usePythonVirtualEnvironment).to.eq('false');
        expect(mockConfig.useGoMVS).to.eq('false');
        expect(mockConfig.enablePythonBestEffortsInstallation).to.eq('false');
        expect(mockConfig.usePipDepTree).to.eq('false');
        expect(mockConfig.exhortMvnPath).to.eq('mvn');
        expect(mockConfig.exhortNpmPath).to.eq('npm');
        expect(mockConfig.exhortGoPath).to.eq('go');
        expect(mockConfig.exhortPython3Path).to.eq('python3');
        expect(mockConfig.exhortPip3Path).to.eq('pip3');
        expect(mockConfig.exhortPythonPath).to.eq('python');
        expect(mockConfig.exhortPipPath).to.eq('pip');    
        expect(mockConfig.exhortSyftPath).to.eq('syft');
        expect(mockConfig.exhortSyftConfigPath).to.eq('');
        expect(mockConfig.exhortSyftImageSource).to.eq('');
        expect(mockConfig.exhortSkopeoPath).to.eq('skopeo');
        expect(mockConfig.exhortSkopeoConfigPath).to.eq('');
        expect(mockConfig.exhortImageServiceEndpoint).to.eq('');
        expect(mockConfig.exhortDockerPath).to.eq('docker');
        expect(mockConfig.exhortPodmanPath).to.eq('podman');
        expect(mockConfig.exhortImagePlatform).to.eq('');
        expect(mockConfig.exhortImageOS).to.eq('');
        expect(mockConfig.exhortImageArch).to.eq('');
        expect(mockConfig.exhortImageVariant).to.eq('');     
    });

    it('should set Exhort Snyk Token', () => {
        const mockToken = 'mockToken';

        expect(mockConfig.exhortSnykToken).to.not.eq(mockToken);  

        mockConfig.setExhortSnykToken(mockToken);

        expect(mockConfig.exhortSnykToken).to.eq(mockToken);    
    });
});