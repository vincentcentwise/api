
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(
    email: string,
    password: string,
    schoolSlug: string,
  ): Promise<{
    accessToken: string;
    tokenType: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
    school: {
      id: string;
      name: string;
      slug: string;
    };
    role: string;
  }> {
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedSlug = schoolSlug.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        memberships: {
          where: {
            status: 'ACTIVE',
            school: { slug: normalizedSlug },
          },
          include: {
            school: true,
          },
        },
      },
    });

    if (!user || !user.passwordHash || !password) {
      throw new UnauthorizedException(
        'Invalid email, password, or school.',
      );
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      password,
    );

    if (!passwordMatches || user.memberships.length === 0) {
      throw new UnauthorizedException(
        'Invalid email, password, or school.',
      );
    }

    const membership = user.memberships[0];

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      schoolId: membership.schoolId,
      membershipId: membership.id,
      role: membership.role,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      school: {
        id: membership.school.id,
        name: membership.school.name,
        slug: membership.school.slug,
      },
      role: membership.role,
    };
  }
}
