
import { config } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import * as argon2 from 'argon2';
import { PrismaClient } from '@schoolhub/database';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

config({
  path: fileURLToPath(
    new URL('../../../packages/database/.env', import.meta.url),
  ),
});

async function readHiddenPassword(
  prompt: string,
): Promise<string> {
  if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error(
      'Run this script in an interactive VS Code terminal or PowerShell terminal.',
    );
  }

  stdout.write(prompt);

  let password = '';

  stdin.setEncoding('utf8');
  stdin.setRawMode(true);
  stdin.resume();

  try {
    for await (const chunk of stdin) {
      for (const character of chunk) {
        if (character === '\u0003') {
          throw new Error('Password entry cancelled.');
        }

        if (character === '\r' || character === '\n') {
          stdout.write('\n');
          return password;
        }

        if (
          character === '\u007f' ||
          character === '\b'
        ) {
          password = password.slice(0, -1);
          continue;
        }

        password += character;
      }
    }
  } finally {
    stdin.setRawMode(false);
    stdin.pause();
  }

  return password;
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is missing from packages/database/.env.',
    );
  }

  const pool = new Pool({ connectionString });

  const prisma = new PrismaClient({
    adapter: new PrismaPg(pool),
  });

  const terminal = createInterface({
    input: stdin,
    output: stdout,
  });

  try {
    const schoolName = (
      await terminal.question('School name: ')
    ).trim();

    const schoolSlug = (
      await terminal.question(
        'School slug (e.g. demo-school): ',
      )
    ).trim().toLowerCase();

    const firstName = (
      await terminal.question(
        'Administrator first name: ',
      )
    ).trim();

    const lastName = (
      await terminal.question(
        'Administrator last name: ',
      )
    ).trim();

    const email = (
      await terminal.question(
        'Administrator email: ',
      )
    ).trim().toLowerCase();

    terminal.close();

    const password = await readHiddenPassword(
      'Administrator password (minimum 12 characters; input hidden): ',
    );

    if (
      !schoolName ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(schoolSlug) ||
      !firstName ||
      !lastName ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      password.length < 12
    ) {
      throw new Error(
        'Invalid details. Check the school slug, names, email, and password length.',
      );
    }

    const passwordHash = await argon2.hash(password);

    await prisma.$transaction(async (tx) => {
      const existingUser = await tx.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new Error(
          'This email already exists. Choose a different email.',
        );
      }

      const school = await tx.school.upsert({
        where: { slug: schoolSlug },
        update: {},
        create: {
          name: schoolName,
          slug: schoolSlug,
        },
      });

      const user = await tx.user.create({
        data: {
          email,
          firstName,
          lastName,
          passwordHash,
        },
      });

      await tx.membership.create({
        data: {
          schoolId: school.id,
          userId: user.id,
          role: 'SCHOOL_ADMIN',
          status: 'ACTIVE',
        },
      });

      console.log('\nAdministrator account created successfully.');
      console.log(`School: ${school.name}`);
      console.log(`School slug: ${school.slug}`);
      console.log(`Administrator email: ${user.email}`);
      console.log('Role: SCHOOL_ADMIN');
      console.log('Membership status: ACTIVE');
    });
   } finally {
    terminal.close();

    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error('Administrator setup failed:', error);
  process.exitCode = 1;
});
