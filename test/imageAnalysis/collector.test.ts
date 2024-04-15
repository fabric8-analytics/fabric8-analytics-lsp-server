'use strict';

import { expect } from 'chai';

import { Image, ImageMap, getRange } from '../../src/imageAnalysis/collector';

describe('Image Analysis Collector tests', () => {

    // Mock image collection
    let reqImages: Image[] = [
        new Image ({ value: 'alpine', position: { line: 1, column: 0 } }, 'FROM --platform=linux/amd64 alpine as a'),
        new Image ({ value: 'alpine:latest', position: { line: 2, column: 0 } }, 'FROM --platform=linux/amd64 alpine:latest AS a'),
        new Image ({ value: 'alpine@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b', position: { line: 3, column: 0 } }, 'FROM --platform=linux/amd64 alpine@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b As a'),
        new Image ({ value: 'alpine', position: { line: 4, column: 0 } }, 'FROM --platform=linux/amd64 alpine as a'),
    ];
    reqImages.forEach(image => image.platform = 'linux/amd64');
    
    it('should create map of images', async () => {

        const imageMap = new ImageMap(reqImages);

        expect(Object.fromEntries(imageMap.mapper)).to.eql({
            'alpine': [reqImages[0], reqImages[3]],
            'alpine:latest': [reqImages[1]],
            'alpine@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b': [reqImages[2]]
        });
    });

    it('should create empty image map', async () => {

        const imageMap = new ImageMap([]);

        expect(Object.keys(imageMap.mapper).length).to.eql(0);
    });

    it('should get image from image map', async () => {

        const imageMap = new ImageMap(reqImages);

        // The image names from the response always iclude 'latest' tag if no tag nor digest is provided
        expect(JSON.stringify(imageMap.get('alpine:latest'))).to.eq(JSON.stringify([reqImages[1], reqImages[0], reqImages[3]]));
        expect(JSON.stringify(imageMap.get('alpine@sha256:c5b1261d6d3e43071626931fc004f70149baeba2c8ec672bd4f27761f8e1ad6b'))).to.eq(JSON.stringify([reqImages[2]]));
    });

    it('should return image range', async () => {

        expect(getRange(reqImages[0])).to.eql(
            {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 39 }
            }
        );

        expect(getRange(reqImages[1])).to.eql(
            {
                start: { line: 1, character: 0 },
                end: { line: 1, character: 46 }
            }
        );

        expect(getRange(reqImages[2])).to.eql(
            {
                start: { line: 2, character: 0 },
                end: { line: 2, character: 111 }
            }
        );

        expect(getRange(reqImages[3])).to.eql(
            {
                start: { line: 3, character: 0 },
                end: { line: 3, character: 39 }
            }
        );
    });
})
