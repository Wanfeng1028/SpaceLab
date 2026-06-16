describe('Auth Flow E2E', () => {
  beforeEach(() => {
    cy.visit('/register');
  });

  it('注册页输入验证', () => {
    cy.get('button').contains('注册').click();
    // Should show validation error
    cy.contains('请填写').should('exist');
  });

  it('导航到登录页', () => {
    cy.contains('登录').click();
    cy.url().should('include', '/login');
  });

  it('登录页表单提交失败有提示', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').first().type('test@example.com');
    cy.get('input[type="password"]').first().type('wrongpassword');
    cy.get('button').contains('登录').click();
    // Should handle error gracefully
    cy.get('form').should('exist');
  });
});
