import { SEEDED } from '../support/commands';
import { openSidebar } from '../support/navigation';
import { goToLastStep } from '../support/hu19';

describe('Caso real local · tabla hash de tres buckets con colisiones', () => {
  it('genera desde chat con chaining seleccionado y busca sobre la misma figura', () => {
    cy.viewport(1280, 600);
    cy.clearLocalStorage();
    cy.loginByApi(SEEDED.student.email, SEEDED.student.password);
    cy.visit('/', { onBeforeLoad: w => w.localStorage.setItem('vista_visualization_mode', '2D') });
    openSidebar();
    cy.get('[data-cy=algorithm-toggle]').click();
    cy.get('[data-cy=algo-item-hash-table-chaining-search]').scrollIntoView().click();
    cy.get('[data-cy=chat-toggle]').click();
    cy.intercept('POST', '/api/generate').as('hash');
    cy.get('[data-cy=chat-input]').type('Tabla hash tamaño 3 con colisiones: [1, 4, 7, 10]');
    cy.get('[data-cy=chat-send]').click();
    cy.wait('@hash', { timeout: 100000 }).then(({ request, response }) => {
      expect(request.body.type).to.eq('hash-table');
      expect(request.body.subtype).to.eq('chaining');
      expect(response?.statusCode).to.eq(200);
      expect(response!.body.contract.size).to.eq(3);
      expect(response!.body.contract.values).to.deep.eq([1, 4, 7, 10]);
      expect(response!.body.nodes).to.have.length(7);
      expect(response!.body.edges).to.have.length(4);
    });
    cy.get('[data-cy=chat-message-error]').should('not.exist');
    cy.get('[data-cy=canvas-2d] [data-node-id]').should('have.length', 7);
    cy.get('[data-cy=canvas-2d] [data-node-id]').then(nodes => {
      expect(nodes.toArray().map(node => node.getAttribute('data-label')))
        .to.have.members(['[0]', '[1]', '[2]', '1', '4', '7', '10']);
    });
    cy.get('[data-cy=algorithm-toggle]').click();
    cy.get('[data-cy=algo-item-hash-table-chaining-search]').should('have.attr', 'aria-pressed', 'true');
    cy.get('[data-cy=algo-uses-canvas]').should('be.visible');
    cy.get('[data-cy=algo-argument]').clear().type('7');
    cy.intercept('POST', '/api/algorithm/steps').as('search');
    cy.get('[data-cy=algo-generate]').click();
    cy.wait('@search').then(({ request, response }) => {
      expect(request.body.nodes).to.have.length(7);
      expect(response?.statusCode).to.eq(200);
      expect(response!.body.steps.at(-1).variables.encontrado).to.eq('true');
      expect(response!.body.steps.at(-1).nodes).to.have.length(7);
    });
    cy.get('[data-cy=algorithm-panel] button[aria-label="Cerrar panel"]').click();
    goToLastStep();
    cy.get('[data-cy=canvas-2d] [data-node-id]').should('have.length', 7);
    cy.screenshot('tabla-hash-3-colisiones-correcta', { capture: 'fullPage' });
  });
});
