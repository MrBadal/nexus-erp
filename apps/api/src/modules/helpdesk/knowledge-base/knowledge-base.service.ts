import {
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, or, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import { knowledgeBaseArticles } from '../../../database/schema/index.js';
import { CreateArticleDto } from './dto/create-article.dto.js';
import { UpdateArticleDto } from './dto/update-article.dto.js';

@Injectable()
export class KnowledgeBaseService {
  constructor(@Inject(DATABASE) private readonly db: DrizzleDB) {}

  async findAll(
    tenantId: string,
    options?: {
      status?: string;
      category?: string;
      search?: string;
      limit?: number;
      offset?: number;
    },
  ) {
    const conditions = [
      eq(knowledgeBaseArticles.tenantId, tenantId),
      isNull(knowledgeBaseArticles.deletedAt),
    ];

    if (options?.status) {
      conditions.push(
        eq(knowledgeBaseArticles.status, options.status as 'draft' | 'published' | 'archived'),
      );
    }

    if (options?.category) {
      conditions.push(eq(knowledgeBaseArticles.category, options.category));
    }

    if (options?.search) {
      const searchTerm = `%${options.search}%`;
      conditions.push(
        or(
          like(knowledgeBaseArticles.title, searchTerm),
          like(knowledgeBaseArticles.content, searchTerm),
        )!,
      );
    }

    const result = await this.db
      .select()
      .from(knowledgeBaseArticles)
      .where(and(...conditions))
      .orderBy(desc(knowledgeBaseArticles.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);

    return result;
  }

  async findById(tenantId: string, id: string) {
    const [article] = await this.db
      .select()
      .from(knowledgeBaseArticles)
      .where(
        and(
          eq(knowledgeBaseArticles.id, id),
          eq(knowledgeBaseArticles.tenantId, tenantId),
          isNull(knowledgeBaseArticles.deletedAt),
        ),
      )
      .limit(1);

    if (!article) {
      throw new NotFoundException(`Article with ID "${id}" not found`);
    }

    // Increment view count
    await this.db
      .update(knowledgeBaseArticles)
      .set({ viewCount: sql`${knowledgeBaseArticles.viewCount} + 1` })
      .where(eq(knowledgeBaseArticles.id, id));

    return { ...article, viewCount: article.viewCount + 1 };
  }

  async create(tenantId: string, data: CreateArticleDto) {
    const [article] = await this.db
      .insert(knowledgeBaseArticles)
      .values({
        tenantId,
        title: data.title,
        content: data.content || null,
        category: data.category || null,
        tags: data.tags || null,
        status: (data.status as 'draft' | 'published' | 'archived') || 'draft',
      })
      .returning();

    return article;
  }

  async update(tenantId: string, id: string, data: UpdateArticleDto) {
    await this.findById(tenantId, id);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.status !== undefined) updateData.status = data.status;

    const [updated] = await this.db
      .update(knowledgeBaseArticles)
      .set(updateData)
      .where(and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async incrementHelpful(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(knowledgeBaseArticles)
      .set({ helpfulCount: sql`${knowledgeBaseArticles.helpfulCount} + 1` })
      .where(and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.tenantId, tenantId)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);

    const [deleted] = await this.db
      .update(knowledgeBaseArticles)
      .set({ deletedAt: new Date() })
      .where(and(eq(knowledgeBaseArticles.id, id), eq(knowledgeBaseArticles.tenantId, tenantId)))
      .returning();

    return deleted;
  }
}
