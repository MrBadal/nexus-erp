import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { eq, and, isNull, desc, like, sql } from 'drizzle-orm';
import { DATABASE, DrizzleDB } from '../../../database/database.module.js';
import {
  jobOpenings,
  candidates,
  interviews,
  offerLetters,
  employees,
  departments,
  designations,
} from '../../../database/schema/index.js';
import { NumberSeriesService } from '../../shared/number-series.service.js';

// ─── DTOs ────────────────────────────────────────────────

export interface CreateJobOpeningDto {
  title: string;
  departmentId?: string;
  designationId?: string;
  positions?: number;
  description?: string;
  requirements?: string;
  location?: string;
  employmentType?: string;
  minSalary?: string;
  maxSalary?: string;
  closingDate?: string;
}

export interface UpdateJobOpeningDto extends Partial<CreateJobOpeningDto> {
  status?: string;
}

export interface CreateCandidateDto {
  jobOpeningId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  resumeUrl?: string;
  currentCompany?: string;
  currentDesignation?: string;
  experienceYears?: number;
  currentSalary?: string;
  expectedSalary?: string;
  source?: string;
  notes?: string;
}

export interface UpdateCandidateDto extends Partial<CreateCandidateDto> {
  status?: string;
  rating?: number;
}

export interface ScheduleInterviewDto {
  candidateId: string;
  round?: number;
  scheduledAt: string;
  duration?: number;
  location?: string;
  meetingLink?: string;
}

export interface CompleteInterviewDto {
  feedback: string;
  rating: number;
}

export interface CreateOfferDto {
  candidateId: string;
  jobOpeningId: string;
  offerDate: string;
  joiningDate?: string;
  offeredSalary: string;
  designation?: string;
  department?: string;
  expiryDate?: string;
  notes?: string;
}

@Injectable()
export class RecruitmentService {
  constructor(
    @Inject(DATABASE) private readonly db: DrizzleDB,
    private readonly numberSeriesService: NumberSeriesService,
  ) {}

  // ─── Job Openings ───────────────────────────────────────

  async findAllJobOpenings(
    tenantId: string,
    options?: { status?: string; search?: string; limit?: number; offset?: number },
  ) {
    const conditions = [
      eq(jobOpenings.tenantId, tenantId),
      isNull(jobOpenings.deletedAt),
    ];

    if (options?.status) {
      conditions.push(eq(jobOpenings.status, options.status as 'draft' | 'open' | 'on_hold' | 'closed' | 'cancelled'));
    }

    if (options?.search) {
      conditions.push(like(jobOpenings.title, `%${options.search}%`));
    }

    return this.db
      .select()
      .from(jobOpenings)
      .where(and(...conditions))
      .orderBy(desc(jobOpenings.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findJobOpeningById(tenantId: string, id: string) {
    const [job] = await this.db
      .select()
      .from(jobOpenings)
      .where(and(eq(jobOpenings.id, id), eq(jobOpenings.tenantId, tenantId), isNull(jobOpenings.deletedAt)))
      .limit(1);

    if (!job) throw new NotFoundException('Job opening not found');
    return job;
  }

  async createJobOpening(tenantId: string, dto: CreateJobOpeningDto) {
    const [job] = await this.db
      .insert(jobOpenings)
      .values({
        tenantId,
        title: dto.title,
        departmentId: dto.departmentId || null,
        designationId: dto.designationId || null,
        positions: dto.positions || 1,
        description: dto.description || null,
        requirements: dto.requirements || null,
        location: dto.location || null,
        employmentType: (dto.employmentType as 'full_time' | 'part_time' | 'contract' | 'intern') || 'full_time',
        minSalary: dto.minSalary || null,
        maxSalary: dto.maxSalary || null,
        closingDate: dto.closingDate || null,
      })
      .returning();

    return job;
  }

  async updateJobOpening(tenantId: string, id: string, dto: UpdateJobOpeningDto) {
    await this.findJobOpeningById(tenantId, id);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.title !== undefined) updates.title = dto.title;
    if (dto.departmentId !== undefined) updates.departmentId = dto.departmentId;
    if (dto.designationId !== undefined) updates.designationId = dto.designationId;
    if (dto.positions !== undefined) updates.positions = dto.positions;
    if (dto.description !== undefined) updates.description = dto.description;
    if (dto.requirements !== undefined) updates.requirements = dto.requirements;
    if (dto.location !== undefined) updates.location = dto.location;
    if (dto.employmentType !== undefined) updates.employmentType = dto.employmentType;
    if (dto.minSalary !== undefined) updates.minSalary = dto.minSalary;
    if (dto.maxSalary !== undefined) updates.maxSalary = dto.maxSalary;
    if (dto.closingDate !== undefined) updates.closingDate = dto.closingDate;
    if (dto.status !== undefined) updates.status = dto.status;

    const [updated] = await this.db
      .update(jobOpenings)
      .set(updates)
      .where(eq(jobOpenings.id, id))
      .returning();

    return updated;
  }

  async publishJobOpening(tenantId: string, id: string) {
    const job = await this.findJobOpeningById(tenantId, id);
    if (job.status !== 'draft' && job.status !== 'on_hold') {
      throw new BadRequestException('Job opening can only be published from draft or on_hold status');
    }

    const [updated] = await this.db
      .update(jobOpenings)
      .set({ status: 'open', publishDate: new Date().toISOString().split('T')[0], updatedAt: new Date() })
      .where(eq(jobOpenings.id, id))
      .returning();

    return updated;
  }

  async closeJobOpening(tenantId: string, id: string) {
    await this.findJobOpeningById(tenantId, id);
    const [updated] = await this.db
      .update(jobOpenings)
      .set({ status: 'closed', updatedAt: new Date() })
      .where(eq(jobOpenings.id, id))
      .returning();

    return updated;
  }

  async softDeleteJobOpening(tenantId: string, id: string) {
    await this.findJobOpeningById(tenantId, id);
    await this.db.update(jobOpenings).set({ deletedAt: new Date() }).where(eq(jobOpenings.id, id));
  }

  // ─── Candidates ─────────────────────────────────────────

  async findAllCandidates(
    tenantId: string,
    options?: { jobOpeningId?: string; status?: string; search?: string; limit?: number; offset?: number },
  ) {
    const conditions = [
      eq(candidates.tenantId, tenantId),
      isNull(candidates.deletedAt),
    ];

    if (options?.jobOpeningId) {
      conditions.push(eq(candidates.jobOpeningId, options.jobOpeningId));
    }

    if (options?.status) {
      conditions.push(eq(candidates.status, options.status as 'new' | 'screening' | 'shortlisted' | 'interview' | 'offered' | 'hired' | 'rejected' | 'withdrawn'));
    }

    if (options?.search) {
      conditions.push(like(candidates.firstName, `%${options.search}%`));
    }

    return this.db
      .select({
        id: candidates.id,
        tenantId: candidates.tenantId,
        jobOpeningId: candidates.jobOpeningId,
        firstName: candidates.firstName,
        lastName: candidates.lastName,
        email: candidates.email,
        phone: candidates.phone,
        currentCompany: candidates.currentCompany,
        currentDesignation: candidates.currentDesignation,
        experienceYears: candidates.experienceYears,
        expectedSalary: candidates.expectedSalary,
        source: candidates.source,
        status: candidates.status,
        rating: candidates.rating,
        appliedAt: candidates.appliedAt,
        createdAt: candidates.createdAt,
        jobTitle: jobOpenings.title,
      })
      .from(candidates)
      .leftJoin(jobOpenings, eq(candidates.jobOpeningId, jobOpenings.id))
      .where(and(...conditions))
      .orderBy(desc(candidates.createdAt))
      .limit(options?.limit || 50)
      .offset(options?.offset || 0);
  }

  async findCandidateById(tenantId: string, id: string) {
    const [candidate] = await this.db
      .select()
      .from(candidates)
      .where(and(eq(candidates.id, id), eq(candidates.tenantId, tenantId), isNull(candidates.deletedAt)))
      .limit(1);

    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  async createCandidate(tenantId: string, dto: CreateCandidateDto) {
    await this.findJobOpeningById(tenantId, dto.jobOpeningId);

    const [candidate] = await this.db
      .insert(candidates)
      .values({
        tenantId,
        jobOpeningId: dto.jobOpeningId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        phone: dto.phone || null,
        resumeUrl: dto.resumeUrl || null,
        currentCompany: dto.currentCompany || null,
        currentDesignation: dto.currentDesignation || null,
        experienceYears: dto.experienceYears ?? null,
        currentSalary: dto.currentSalary || null,
        expectedSalary: dto.expectedSalary || null,
        source: dto.source || null,
        notes: dto.notes || null,
      })
      .returning();

    return candidate;
  }

  async updateCandidate(tenantId: string, id: string, dto: UpdateCandidateDto) {
    await this.findCandidateById(tenantId, id);

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (dto.firstName !== undefined) updates.firstName = dto.firstName;
    if (dto.lastName !== undefined) updates.lastName = dto.lastName;
    if (dto.email !== undefined) updates.email = dto.email;
    if (dto.phone !== undefined) updates.phone = dto.phone;
    if (dto.currentCompany !== undefined) updates.currentCompany = dto.currentCompany;
    if (dto.currentDesignation !== undefined) updates.currentDesignation = dto.currentDesignation;
    if (dto.experienceYears !== undefined) updates.experienceYears = dto.experienceYears;
    if (dto.expectedSalary !== undefined) updates.expectedSalary = dto.expectedSalary;
    if (dto.source !== undefined) updates.source = dto.source;
    if (dto.status !== undefined) updates.status = dto.status;
    if (dto.rating !== undefined) updates.rating = dto.rating;
    if (dto.notes !== undefined) updates.notes = dto.notes;

    const [updated] = await this.db
      .update(candidates)
      .set(updates)
      .where(eq(candidates.id, id))
      .returning();

    return updated;
  }

  async softDeleteCandidate(tenantId: string, id: string) {
    await this.findCandidateById(tenantId, id);
    await this.db.update(candidates).set({ deletedAt: new Date() }).where(eq(candidates.id, id));
  }

  // ─── Interviews ─────────────────────────────────────────

  async scheduleInterview(tenantId: string, dto: ScheduleInterviewDto) {
    const candidate = await this.findCandidateById(tenantId, dto.candidateId);

    const [interview] = await this.db
      .insert(interviews)
      .values({
        tenantId,
        candidateId: dto.candidateId,
        round: dto.round || 1,
        scheduledAt: new Date(dto.scheduledAt),
        duration: dto.duration || 60,
        location: dto.location || null,
        meetingLink: dto.meetingLink || null,
      })
      .returning();

    // Update candidate status to interview
    if (candidate.status === 'new' || candidate.status === 'screening' || candidate.status === 'shortlisted') {
      await this.db
        .update(candidates)
        .set({ status: 'interview', updatedAt: new Date() })
        .where(eq(candidates.id, dto.candidateId));
    }

    return interview;
  }

  async findInterviewsByCandidateId(tenantId: string, candidateId: string) {
    return this.db
      .select()
      .from(interviews)
      .where(and(eq(interviews.tenantId, tenantId), eq(interviews.candidateId, candidateId), isNull(interviews.deletedAt)))
      .orderBy(desc(interviews.round));
  }

  async completeInterview(tenantId: string, id: string, dto: CompleteInterviewDto) {
    const [interview] = await this.db
      .select()
      .from(interviews)
      .where(and(eq(interviews.id, id), eq(interviews.tenantId, tenantId)))
      .limit(1);

    if (!interview) throw new NotFoundException('Interview not found');
    if (interview.status !== 'scheduled') throw new BadRequestException('Interview is not in scheduled status');

    const [updated] = await this.db
      .update(interviews)
      .set({
        status: 'completed',
        feedback: dto.feedback,
        rating: dto.rating,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(interviews.id, id))
      .returning();

    return updated;
  }

  // ─── Offer Letters ──────────────────────────────────────

  async createOffer(tenantId: string, dto: CreateOfferDto) {
    await this.findCandidateById(tenantId, dto.candidateId);

    const [offer] = await this.db
      .insert(offerLetters)
      .values({
        tenantId,
        candidateId: dto.candidateId,
        jobOpeningId: dto.jobOpeningId,
        offerDate: dto.offerDate,
        joiningDate: dto.joiningDate || null,
        offeredSalary: dto.offeredSalary,
        designation: dto.designation || null,
        department: dto.department || null,
        expiryDate: dto.expiryDate || null,
        notes: dto.notes || null,
      })
      .returning();

    // Update candidate status to offered
    await this.db
      .update(candidates)
      .set({ status: 'offered', updatedAt: new Date() })
      .where(eq(candidates.id, dto.candidateId));

    return offer;
  }

  async acceptOffer(tenantId: string, offerId: string) {
    const [offer] = await this.db
      .select()
      .from(offerLetters)
      .where(and(eq(offerLetters.id, offerId), eq(offerLetters.tenantId, tenantId)))
      .limit(1);

    if (!offer) throw new NotFoundException('Offer letter not found');
    if (offer.status !== 'sent' && offer.status !== 'draft') {
      throw new BadRequestException('Offer can only be accepted from draft or sent status');
    }

    // Update offer
    await this.db
      .update(offerLetters)
      .set({ status: 'accepted', acceptedAt: new Date(), updatedAt: new Date() })
      .where(eq(offerLetters.id, offerId));

    // Update candidate to hired
    await this.db
      .update(candidates)
      .set({ status: 'hired', updatedAt: new Date() })
      .where(eq(candidates.id, offer.candidateId));

    // Increment filled positions on job opening
    await this.db
      .update(jobOpenings)
      .set({
        filledPositions: sql`${jobOpenings.filledPositions} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(jobOpenings.id, offer.jobOpeningId));

    return { offerId, candidateId: offer.candidateId, status: 'accepted' };
  }

  async rejectOffer(tenantId: string, offerId: string) {
    const [offer] = await this.db
      .select()
      .from(offerLetters)
      .where(and(eq(offerLetters.id, offerId), eq(offerLetters.tenantId, tenantId)))
      .limit(1);

    if (!offer) throw new NotFoundException('Offer letter not found');

    await this.db
      .update(offerLetters)
      .set({ status: 'rejected', rejectedAt: new Date(), updatedAt: new Date() })
      .where(eq(offerLetters.id, offerId));

    await this.db
      .update(candidates)
      .set({ status: 'rejected', updatedAt: new Date() })
      .where(eq(candidates.id, offer.candidateId));

    return { offerId, status: 'rejected' };
  }

  // ─── Hire (Create Employee from Candidate) ──────────────

  async hireCandidate(tenantId: string, candidateId: string, joiningDate: string) {
    const candidate = await this.findCandidateById(tenantId, candidateId);

    if (candidate.status !== 'hired') {
      throw new BadRequestException('Candidate must have an accepted offer before being hired');
    }

    if (candidate.hiredEmployeeId) {
      throw new BadRequestException('Employee already created for this candidate');
    }

    // Get job opening for department/designation
    const [job] = await this.db
      .select()
      .from(jobOpenings)
      .where(eq(jobOpenings.id, candidate.jobOpeningId))
      .limit(1);

    const employeeId = await this.numberSeriesService.getNext(tenantId, 'EMP');

    const [employee] = await this.db
      .insert(employees)
      .values({
        tenantId,
        employeeId,
        firstName: candidate.firstName,
        lastName: candidate.lastName,
        email: candidate.email,
        phone: candidate.phone || null,
        departmentId: job?.departmentId || null,
        designationId: job?.designationId || null,
        dateOfJoining: joiningDate,
        employmentType: job?.employmentType || 'full_time',
      })
      .returning();

    // Link candidate to employee
    await this.db
      .update(candidates)
      .set({ hiredEmployeeId: employee.id, updatedAt: new Date() })
      .where(eq(candidates.id, candidateId));

    return { candidateId, employeeId: employee.id, employee };
  }
}
