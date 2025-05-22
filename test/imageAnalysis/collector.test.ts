'use strict';

import { expect } from 'chai';

import { Image, ImageMap, getRange } from '../../src/imageAnalysis/collector';

describe('Image Analysis Collector tests', () => {

    // Mock image collection, we can't test unpinned images here as they will change over time, resulting in tests that always need updating.
    const reqImages: Image[] = [
        new Image ({ value: 'alpine:3.21.3', position: { line: 2, column: 0 } }, 'FROM --platform=linux/amd64 alpine:3.21.3 AS a'),
        new Image ({ value: 'alpine@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b', position: { line: 3, column: 0 } }, 'FROM --platform=linux/amd64 alpine@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b As a'),
    ];
    reqImages.forEach(image => image.platform = 'linux/amd64');
    
    it('should create map of images', async () => {

        const imageMap = new ImageMap(reqImages);

        expect(Object.fromEntries(imageMap.mapper)).to.eql({
            'pkg:oci/alpine@sha256:1c4eef651f65e2f7daee7ee785882ac164b02b78fb74503052a26dc061c90474?arch=amd64&os=linux&tag=3.21.3': [reqImages[0]],
            'pkg:oci/alpine@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b?arch=amd64&os=linux': [reqImages[1]]
        });
    }).timeout(10000);

    it('should create empty image map', async () => {

        const imageMap = new ImageMap([]);

        expect(Object.keys(imageMap.mapper).length).to.eql(0);
    });

    it('should get image from image map', async () => {

        const imageMap = new ImageMap(reqImages);

        expect(JSON.stringify(imageMap.get('pkg:oci/alpine@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b?arch=amd64&os=linux'))).to.eq(JSON.stringify([reqImages[1]]));
    });

    it('should return image range', async () => {
        expect(getRange(reqImages[0])).to.eql(
            {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 46 }
            }
        );

        expect(getRange(reqImages[1])).to.eql(
            {
                start: { line: 2, character: 0 },
                end: { line: 2, character: 111 }
            }
        );
    });
}).beforeAll(() => {
    // https://github.com/containers/skopeo/issues/1654
    process.env['EXHORT_SKOPEO_CONFIG_PATH'] = './auth.json';
});
