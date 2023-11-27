'use strict';

import { expect } from 'chai';

import { isDefined } from '../src/utils';

describe('Utils tests', () => {

    it('should return true when all keys are defined in the object (with key request)', () => {
        const obj = {
            a: {
                b: {
                    c: 10,
                },
            },    
        };
        expect(isDefined(obj, 'a', 'b', 'c')).to.be.true;
    });

    it('should return true when all keys are defined in the object (without key requests)', () => {
        const obj = {
            a: {
                b: {
                    c: 10,
                },
            },    
        };
        expect(isDefined(obj)).to.be.true;
    });

    it('should return false if any key is not defined in the object', () => {
        const obj = {
            a: {
                b: {
                    c: 10,
                },
            },    
        };
        expect(isDefined(obj, 'a', 'b', 'd')).to.be.false;
    });

    it('should return false if the object itself is not defined', () => {
        const obj = null;
        expect(isDefined(obj, 'a', 'b', 'c')).to.be.false;
    });

    it('should return false if any intermediate key in the object chain is not defined', () => {
        const obj = {
            a: {
                b: null
            },    
        };
        expect(isDefined(obj, 'a', 'b', 'c')).to.be.false;
    });

    it('should return false if any intermediate key in the object chain is undefined', () => {
        const obj = {
            a: {
                b: undefined
            },    
        };
        expect(isDefined(obj, 'a', 'b', 'c')).to.be.false;
    });
});