describe('SpaceLab E2E', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('首页加载正常', () => {
    cy.contains('SpaceLab').should('exist');
    cy.get('app-root').should('exist');
  });

  it('导航栏可点击', () => {
    cy.get('a').contains('Blog').should('exist');
    cy.get('a').contains('Projects').should('exist');
    cy.get('a').contains('About').should('exist');
  });

  it('Blog 页面加载', () => {
    cy.visit('/blog');
    cy.contains('Blog').should('exist');
  });

  it('Projects 页面加载', () => {
    cy.visit('/projects');
    cy.contains('Projects').should('exist');
  });

  it('登录页表单存在', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').should('exist');
    cy.get('input[type="password"]').should('exist');
    cy.get('button').contains('登录').should('exist');
  });

  it('注册页表单存在', () => {
    cy.visit('/register');
    cy.get('input').should('have.length.at.least', 3);
  });

  it('AI Frontline 页面加载', () => {
    cy.visit('/ai-frontline');
    cy.contains('AI').should('exist');
  });

  it('Lab 页面加载', () => {
    cy.visit('/lab');
    cy.contains('Lab').should('exist');
  });

  it('About 页面加载', () => {
    cy.visit('/about');
    cy.contains('About').should('exist');
  });

  it('404 页面显示', () => {
    cy.visit('/nonexistent-page');
    cy.contains('404').should('exist');
  });
});
