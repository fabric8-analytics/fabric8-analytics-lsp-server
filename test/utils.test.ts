'use strict';

import { expect } from 'chai';

import * as utils from '../src/utils';

describe('Utils tests', () => {

    it('should return true when all keys are defined in the object (with key request)', () => {
        const obj = {
            a: {
                b: {
                    c: 10,
                },
            },    
        };
        expect(utils.isDefined(obj, 'a', 'b', 'c')).to.be.true;
    });

    it('should return true when all keys are defined in the object (without key requests)', () => {
        const obj = {
            a: {
                b: {
                    c: 10,
                },
            },    
        };
        expect(utils.isDefined(obj)).to.be.true;
    });

    it('should return false if any key is not defined in the object', () => {
        const obj = {
            a: {
                b: {
                    c: 10,
                },
            },    
        };
        expect(utils.isDefined(obj, 'a', 'b', 'd')).to.be.false;
    });

    it('should return false if the object itself is not defined', () => {
        const obj = null;
        expect(utils.isDefined(obj, 'a', 'b', 'c')).to.be.false;
    });

    it('should return false if any intermediate key in the object chain is not defined', () => {
        const obj = {
            a: {
                b: null
            },    
        };
        expect(utils.isDefined(obj, 'a', 'b', 'c')).to.be.false;
    });

    it('should return false if any intermediate key in the object chain is undefined', () => {
        const obj = {
            a: {
                b: undefined
            },    
        };
        expect(utils.isDefined(obj, 'a', 'b', 'c')).to.be.false;
    });

    it('should decode the URI path correctly for non Windows OS', () => {
        const uriString = 'file:///mock/path%20with%20spaces';

        const decodedPath = utils.decodeUriPath(uriString);

        expect(decodedPath).to.equal('/mock/path with spaces');
    });

    it('should decode the URI path correctly for Windows OS', () => {
        const uriString = 'file:///mock/path%20with%20spaces';

        const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
        
        Object.defineProperty(process, 'platform', {
            value: 'win32'
        });

        const decodedPath = utils.decodeUriPath(uriString);

        expect(decodedPath).to.equal('mock/path with spaces');

        if (originalPlatform) {
            Object.defineProperty(process, 'platform', originalPlatform);
        }
    });
});