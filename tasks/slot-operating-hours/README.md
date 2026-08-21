# Slot Operating Hours Feature

## Overview

This feature adds court-level operating hours to constrain slot generation and improve the SaaS user experience.

## Problem Statement

Currently, slot generation uses ONLY `PricingRule.startTime` and `PricingRule.endTime` to determine time ranges. The `Court` model has no operating hours fields, causing:

1. **User confusion**: Courts have operating hours (e.g., 9 AM - 11:30 PM) but slots generate based on pricing rule times (e.g., 6 AM - 6 PM)
2. **Configuration complexity**: Users must manually ensure pricing rules align with business hours
3. **Potential errors**: Easy to accidentally create slots for times when the venue is closed

## Solution

Add court-level operating hours with validation:

1. **Court model**: Add `openingTime` and `closingTime` fields (optional, with sensible defaults)
2. **Validation**: Pricing rules cannot exceed court operating hours
3. **UI updates**: Court dialog shows operating hours fields, pricing dialog shows court hours as reference

## SaaS Product Design Rationale

This follows industry best practices from venue booking systems like:
- **Skedda**: Venue-level operating hours with buffer time rules
- **Square Appointments**: Staff/venue working hours with centralized calendar
- **Mindbody**: Active appointment times based on business hours

**Why this approach**:
- ✅ Simple UX: Set hours once per court
- ✅ Validates pricing rules against court hours
- ✅ Industry-standard pattern
- ✅ Backward compatible (optional fields with defaults)
- ✅ Reduces configuration burden

## Tasks

| Task | Description | Status |
|------|-------------|--------|
| [Task 1](task-1-schema.md) | Add operating hours to Court schema | ✅ Complete |
| [Task 2](task-2-backend-validation.md) | Add pricing rule validation | ✅ Complete |
| [Task 3](task-3-court-dto.md) | Update court DTOs | ✅ Complete |
| [Task 4](task-4-court-ui.md) | Add operating hours to court dialog | Pending |
| [Task 5](task-5-pricing-ui.md) | Update pricing dialog with court hours | Pending |
| [Task 6](task-6-default-times.md) | Update default time presets | Pending |

## Completion Criteria

- [ ] Courts have optional `openingTime` and `closingTime` fields
- [ ] Pricing rules are validated against court operating hours
- [ ] Court dialog allows setting operating hours
- [ ] Pricing dialog shows court operating hours
- [ ] Time presets respect court operating hours
- [ ] Database migrated successfully
- [ ] TypeScript compilation succeeds
- [ ] Frontend displays correct time ranges
