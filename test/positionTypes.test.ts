'use strict';

import { expect } from 'chai';

import { IPosition, IPositionedString, IPositionedContext } from '../src/positionTypes';

describe('Position Types tests', () => {
    describe('IPosition Interface', () => {
      it('should have properties line and column', () => {
        const position: IPosition = { line: 1, column: 5 };
        expect(position).to.have.property('line');
        expect(position).to.have.property('column');
      });
    });
  
    describe('IPositionedString Interface', () => {
      it('should have properties value and position', () => {
        const positionedString: IPositionedString = { value: 'test', position: { line: 1, column: 5 } };
        expect(positionedString).to.have.property('value');
        expect(positionedString).to.have.property('position');
      });
    });
  
    describe('IPositionedContext Interface', () => {
      it('should have properties value and range', () => {
        // Import Range from 'vscode-languageserver' to mock the range object
        const rangeMock = { start: { line: 1, character: 0 }, end: { line: 1, character: 5 } };
        const positionedContext: IPositionedContext = { value: 'test', range: rangeMock };
        expect(positionedContext).to.have.property('value');
        expect(positionedContext).to.have.property('range');
      });
    });
  });