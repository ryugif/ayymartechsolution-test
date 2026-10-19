import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { InvalidCredentialsException } from '../exceptions/app.exception';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));
jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

const PASSWORD = 'correct horse';
const USER = {
  id: 'u1',
  email: 'designer@example.com',
  passwordHash: bcrypt.hashSync(PASSWORD, 4), // low cost keeps the test fast
};

function setup() {
  const prisma = { user: { findUnique: jest.fn() } };
  const jwt = { signAsync: jest.fn().mockResolvedValue('signed.token') };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
  );
  return { prisma, jwt, service };
}

describe('AuthService.login', () => {
  it('returns a token and the public user on valid credentials', async () => {
    const { prisma, jwt, service } = setup();
    prisma.user.findUnique.mockResolvedValue(USER);

    const result = await service.login(USER.email, PASSWORD);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: USER.email },
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: USER.id,
      email: USER.email,
    });
    // toEqual proves the password hash is not part of the result
    expect(result).toEqual({
      token: 'signed.token',
      user: { id: USER.id, email: USER.email },
    });
  });

  it('rejects a wrong password and issues no token', async () => {
    const { prisma, jwt, service } = setup();
    prisma.user.findUnique.mockResolvedValue(USER);

    await expect(service.login(USER.email, 'wrong')).rejects.toBeInstanceOf(
      InvalidCredentialsException,
    );
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rejects an unknown email', async () => {
    const { prisma, jwt, service } = setup();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login('nobody@example.com', PASSWORD),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('gives the same error for unknown email and wrong password, so accounts cannot be probed', async () => {
    const { prisma, service } = setup();
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(USER);

    const unknownEmail = await service
      .login('nobody@example.com', PASSWORD)
      .catch((e: unknown) => e);
    const wrongPassword = await service
      .login(USER.email, 'wrong')
      .catch((e: unknown) => e);

    expect(unknownEmail).toBeInstanceOf(InvalidCredentialsException);
    expect((unknownEmail as Error).message).toBe(
      (wrongPassword as Error).message,
    );
  });
});
