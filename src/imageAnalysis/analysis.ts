/* --------------------------------------------------------------------------------------------
 * Copyright (c) Red Hat
 * Licensed under the Apache-2.0 License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import { execSync } from 'child_process';

import { connection } from '../server';
import { globalConfig } from '../config';
import { isDefined, decodeUriPath } from '../utils';
import { IImage } from '../imageAnalysis/collector';

/**
 * Represents the Red Hat Dependency Analytics (RHDA) analysis report, with images mapped by string keys.
 */
interface IExhortAnalysisReport {
  [key: string]: IImageReport;
}

/**
 * Represents the RHDA analysis report for a single image.
 */
interface IImageReport {
  providers: Map<string, IProvider>;
}

/**
 * Represents a provider of dependencies for an image.
 */
interface IProvider {
  status: IStatus;
  sources: Map<string, ISource>;
}

/**
 * Represents the status of a provider.
 */
interface IStatus {
  ok: boolean;
}

/**
 * Represents a source of dependencies.
 */
interface ISource {
  summary: ISummary;
  dependencies: ISourceDependency[];
}

/**
 * Represents the summary of vulnerabilities for a source.
 */
interface ISummary {
  total: number,
  critical: number,
  high: number,
  medium: number,
  low: number,
}

/**
 * Represents a dependency reported by a source.
 */
interface ISourceDependency {
  recommendation: string | null;
}

/**
 * Represents data collected related to an image.
 */
interface IArtifact {
  id: string;
  summary: ISummary;
  dependencies: ISourceDependency[];
}

/**
* Represents data specification related to an image.
*/
interface IImageData {
  sourceId: string;
  issuesCount: number;
  recommendationRef: string;
  highestVulnerabilitySeverity: string;
}

/**
 * Implementation of IImageData interface.
 */
class ImageData implements IImageData {
  constructor(
      public sourceId: string,
      public issuesCount: number,
      public recommendationRef: string,
      public highestVulnerabilitySeverity: string
  ) {}
}

/**
* Represents the parsed response of Red Hat Dependency Analytics (RHDA) analysis report, with images mapped by string keys.
*/
interface IAnalysisResponse {
  images: Map<string, ImageData[]>;
}

/**
* Implementation of IAnalysisResponse interface.
*/
class AnalysisResponse implements IAnalysisResponse {
  images: Map<string, ImageData[]> = new Map<string, ImageData[]>();

  constructor(resData: IExhortAnalysisReport, diagnosticFilePath: string) {
      const failedProviders: string[] = [];

      Object.entries(resData).map(([imageRef, imageData]) => {
        const artifacts: IArtifact[] = [];

        if (isDefined(imageData, 'providers')) {
            Object.entries(imageData.providers).map(([providerName, providerData]: [string, IProvider]) => {
                if (isDefined(providerData, 'status', 'ok') && providerData.status.ok) {
                    if (isDefined(providerData, 'sources')) {
                        Object.entries(providerData.sources).map(([sourceName, sourceData]: [string, ISource]) => {
                          if (isDefined(sourceData, 'summary')) {
                              artifacts.push({id: `${providerName}(${sourceName})`, summary: sourceData.summary, dependencies: sourceData.dependencies});
                          }
                        });
                    }
                } else {
                    failedProviders.push(providerName);
                }
            });

            artifacts.forEach(artifact => {
                  const sd = new ImageData(artifact.id, this.getTotalIssues(artifact.summary), this.getRecommendation(artifact.dependencies), this.getHighestSeverity(artifact.summary));

                  this.images[imageRef] = this.images[imageRef] || [];
                  this.images[imageRef].push(sd);
            });
        }

        if (failedProviders.length !== 0) {
          const uniqueFailedProviders = Array.from(new Set(failedProviders));
          const errMsg = `The image component analysis couldn't fetch data from the following providers: [${uniqueFailedProviders.join(', ')}]`;
          connection.console.warn(`Component Analysis Error: ${errMsg}`);
          connection.sendNotification('caError', {
              errorMessage: errMsg,
              uri: decodeUriPath(diagnosticFilePath),
          });
        }
    });
  }

  /**
   * Retrieves the total number of issues from a dependency summary.
   * @param summary The dependency summary object.
   * @returns The total number of issues.
   * @private
   */
    private getTotalIssues(summary: any): number {
      return isDefined(summary, 'total') ? summary.total : 0;
  }

  /**
   * Retrieves the highest vulnerability severity from a source summary.
   * @param summary The source summary object.
   * @returns The highest severity level.
   * @private
   */
  private getHighestSeverity(summary: any): string {
      let highestSeverity = 'NONE';

      if ( isDefined(summary, 'critical') && summary.critical > 0) {
        highestSeverity = 'CRITICAL';
      } else if ( isDefined(summary, 'high') && summary.high > 0) {
        highestSeverity = 'HIGH';
      } else if ( isDefined(summary, 'medium') && summary.medium > 0) {
        highestSeverity = 'MEDIUM';
      } else if ( isDefined(summary, 'low') && summary.low > 0) {
        highestSeverity = 'LOW';
      }

      return highestSeverity;
  }

  /**
   * Retrieves the recommendation reference from a list of dependency objects.
   * @param dependencies The list of dependency objects.
   * @returns The recommendation reference or an empty string.
   * @private
   */
  private getRecommendation(dependencies: ISourceDependency[]): string {
    let recommendation = '';  
    if (dependencies && dependencies.length > 0){
        recommendation = isDefined(dependencies[0], 'recommendation') ? dependencies[0].recommendation.split(':')[1].split('@')[0] : '';
    }
    return recommendation;
  }
}

/**
 * Represents the options for running image analysis.
 */
interface IOptions {
    RHDA_TOKEN: string;
    RHDA_SOURCE: string;
    EXHORT_SYFT_PATH: string;
    EXHORT_SYFT_CONFIG_PATH: string;
    EXHORT_SKOPEO_PATH: string;
    EXHORT_SKOPEO_CONFIG_PATH: string;
    EXHORT_DOCKER_PATH: string;
    EXHORT_PODMAN_PATH: string;
    EXHORT_IMAGE_PLATFORM: string;
}

/**
 * Executes RHDA image analysis using the provided images and options.
 * @param images - The images to analyze.
 * @param options - The options for running image analysis.
 * @returns A Promise resolving to the analysis response.
 */
function imageAnalysisService(images: IImage[], options: IOptions): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const jarPath = `${__dirname}/../javaApiAdapter/exhort-java-api-adapter-1.0-SNAPSHOT-jar-with-dependencies.jar`;
      const reportType = 'json';
      let parameters = '';
      let properties = '';
  
      images.forEach(image => {
        if (image.platform) {
          parameters += ` ${image.name.value}^^${image.platform}`;
        } else {
          parameters += ` ${image.name.value}`;
        }
      });
  
      for (const setting in options) {
        if (options[setting]) {
          properties += ` -D${setting}=${options[setting]}`;
        }
      }
  
      try {
        const result = execSync(`java${properties} -jar ${jarPath} ${reportType}${parameters}`, {
          maxBuffer: 1000 * 1000 * 10, // 10 MB
        });
        resolve(JSON.parse(result.toString()));
      } catch (error) {
        reject(error);
      }
    });
  }
  
/**
 * Performs RHDA image analysis on provided images.
 * @param diagnosticFilePath - The path to the image file to analyze.
 * @param images - The images to analyze.
 * @returns A Promise resolving to an AnalysisResponse object.
 */
async function executeImageAnalysis(diagnosticFilePath: string, images:  IImage[]): Promise<AnalysisResponse> {
    
    // Define configuration options for the component analysis request
    const options: IOptions = {
        'RHDA_TOKEN': globalConfig.telemetryId,
        'RHDA_SOURCE': globalConfig.utmSource,
        'EXHORT_SYFT_PATH': globalConfig.exhortSyftPath,
        'EXHORT_SYFT_CONFIG_PATH': globalConfig.exhortSyftConfigPath,
        'EXHORT_SKOPEO_PATH': globalConfig.exhortSkopeoPath,
        'EXHORT_SKOPEO_CONFIG_PATH': globalConfig.exhortSkopeoConfigPath,
        'EXHORT_DOCKER_PATH': globalConfig.exhortDockerPath,
        'EXHORT_PODMAN_PATH': globalConfig.exhortPodmanPath,
        'EXHORT_IMAGE_PLATFORM': globalConfig.exhortImagePlatform,
    };

    const imageAnalysisJson = await imageAnalysisService(images, options);

    return new AnalysisResponse(imageAnalysisJson, diagnosticFilePath);
}

export { executeImageAnalysis, ImageData };