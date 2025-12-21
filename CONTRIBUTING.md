# Contributing to guacd-ts

Thank you for your interest in contributing to guacd-ts! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful and professional in all interactions.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YasushiMatsumoto/guacd-ts.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b feature/your-feature-name`

## Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run linter
npm run lint

# Format code
npm run format
```

## Project Structure

```
guacd-ts/
├── src/
│   ├── types.ts              # Type definitions
│   ├── logger.ts             # Logging utilities
│   ├── crypt.ts              # Encryption utilities
│   ├── parser.ts             # Guacamole protocol parser
│   ├── guacd-client.ts       # guacd TCP client
│   ├── client-connection.ts  # WebSocket<->guacd bridge
│   ├── server.ts             # Main server class
│   ├── index.ts              # Public exports
│   └── __tests__/            # Unit tests
├── examples/                  # Usage examples
├── dist/                      # Build output
└── package.json
```

## Coding Standards

### TypeScript

- Use strict TypeScript settings
- Provide proper type definitions
- No `any` types (use `unknown` if needed)
- Document public APIs with JSDoc comments

### Code Style

- Follow existing code style
- Use Prettier for formatting: `npm run format`
- Use ESLint for linting: `npm run lint`
- 100 characters per line maximum

### Naming Conventions

- Classes: `PascalCase`
- Functions/methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Private members: prefix with `private`
- Interfaces: `PascalCase` without `I` prefix

## Testing

- Write tests for all new features
- Maintain minimum 70% code coverage
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

```typescript
describe('Feature', () => {
  it('should do something specific', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = doSomething(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add session joining support
fix: handle connection timeout properly
docs: update README with examples
test: add tests for GuacdClient
refactor: simplify error handling
chore: update dependencies
```

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass: `npm test`
4. Ensure code is formatted: `npm run format`
5. Ensure linting passes: `npm run lint`
6. Update CHANGELOG.md
7. Submit pull request with clear description

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass
- [ ] No new warnings
```

## Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for public APIs
- Include code examples where helpful
- Update type definitions

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues and PRs first

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
