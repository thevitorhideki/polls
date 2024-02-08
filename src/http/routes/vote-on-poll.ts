import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { FastifyInstance } from 'fastify';
import { randomUUID } from 'crypto';

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/votes', async (request, reply) => {
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid(),
    });

    const voteOnPollParams = z.object({
      pollId: z.string().uuid(),
    });

    const { pollOptionId } = voteOnPollBody.parse(request.body);
    const { pollId } = voteOnPollParams.parse(request.params);

    let { userId } = request.cookies;

    if (userId) {
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          userId_pollId: {
            userId,
            pollId,
          },
        },
      });

      if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId !== pollOptionId) {
        await prisma.vote.delete({
          where: {
            id: userPreviousVoteOnPoll.id,
          },
        });
      } else if (userPreviousVoteOnPoll) {
        return reply.status(400).send({ message: 'Você já votou nessa enquete!' });
      }
    }

    if (!userId) {
      userId = randomUUID();

      reply.setCookie('userId', userId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 dias
        signed: true,
        httpOnly: true,
      });
    }

    await prisma.vote.create({
      data: {
        userId,
        pollId,
        pollOptionId,
      },
    });

    return reply.status(201).send();
  });
}
