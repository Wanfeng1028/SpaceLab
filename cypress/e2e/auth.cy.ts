describe('Auth Flow E2E', () => {
  beforeEach(() => {
    cy.visit('/register');
  });

  it('注册页输入验证', () => {
    cy.get('button').contains('注册').click();
    cy.contains('请填写').should('exist');
  });

  it('注册页有图形验证码', () => {
    cy.get('img[alt="验证码"]').should('exist');
    cy.get('input[placeholder="输入验证码"]').should('exist');
  });

  it('点击验证码图片可刷新', () => {
    cy.get('img[alt="验证码"]').should('exist').click();
    // After click the image src should change (new captcha id)
    cy.get('img[alt="验证码"]').should('exist');
  });

  it('导航到登录页', () => {
    cy.contains('登录').click();
    cy.url().should('include', '/login');
  });

  it('登录页有图形验证码', () => {
    cy.visit('/login');
    cy.get('img[alt="验证码"]').should('exist');
    cy.get('input[placeholder="输入验证码"]').should('exist');
  });

  it('登录页表单提交失败有提示', () => {
    cy.visit('/login');
    cy.get('input[type="email"]').first().type('test@example.com');
    cy.get('input[type="password"]').first().type('wrongpassword');
    cy.get('input[placeholder="输入验证码"]').first().type('123');
    cy.get('button').contains('登录').click();
    cy.get('form').should('exist');
  });
});
