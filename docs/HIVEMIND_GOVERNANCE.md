# HiveMind Governance Guide

This guide explains how to use the HiveMind Charter governance system in practice. The governance layer is **opt-in**, **label-driven**, and designed to be lightweight and flexible.

## Quick Start

The HiveMind governance system uses GitHub labels to trigger governance processes. All governance is optional - only use these labels when you want governance oversight.

## Label Schema

### Process Trigger Labels

#### `affects:user:<username>`

**Purpose**: Triggers the Individual Veto Process  
**When to use**: When a PR directly affects a specific person's code, configuration, or personal boundaries  
**Effect**: 
- Notifies the specified user
- Gives them 7 days to review and respond
- User can approve, request modifications, or exercise veto

**Example usage**:
```
affects:user:alice
affects:user:bob
```

#### `council-review`

**Purpose**: Requests Council of Elders advisory input  
**When to use**: For significant changes that would benefit from experienced perspective  
**Effect**:
- Notifies all council members (defined in `.hivemind/council.json`)
- Council has 5 days to provide non-binding feedback
- Does NOT block the PR - feedback is advisory only

### Status Labels

These labels are typically added automatically by workflows or manually to track governance state:

#### `charter-compliant`

Indicates that the PR has completed all required Charter processes.

#### `sovereignty-protected`

Marks decisions that involved personal boundary protection or individual veto considerations.

#### `awaiting-council-review`

Shows that council review was requested and is pending.

#### `awaiting-individual-response`

Shows that an individual's response is pending for their veto opportunity.

#### `governance-approved`

Indicates all governance processes have completed successfully.

### Action Labels

#### `veto-exercised`

Applied when an individual has exercised their veto right.

#### `modifications-requested`

Applied when an individual or council has requested changes before approval.

## Usage Examples

### Example 1: Simple Change (No Governance)

For routine changes that don't affect specific people or need council input:

1. Create PR as normal
2. Don't add any governance labels
3. Review and merge per normal process

**No governance overhead for routine work!**

### Example 2: Change Affecting a Specific User

You're modifying code that `@alice` wrote or configuration she uses:

1. Create PR
2. Add label: `affects:user:alice`
3. Alice receives notification
4. Alice has 7 days to:
   - Comment with approval
   - Request modifications
   - Exercise veto by commenting
5. Once Alice responds (or timeout expires), proceed accordingly
6. Add `charter-compliant` label when complete

### Example 3: Significant Architectural Change

You're proposing a major refactor that changes core patterns:

1. Create PR with detailed description
2. Add label: `council-review`
3. Council members receive notification
4. Council has 5 days to provide feedback (non-binding)
5. Consider feedback, discuss in comments
6. Repository owner makes final decision
7. Document rationale in PR comments
8. Add `governance-approved` label

### Example 4: Change Affecting Multiple People

You're modifying shared configuration that affects Alice, Bob, and Carol:

1. Create PR
2. Add labels:
   - `affects:user:alice`
   - `affects:user:bob`
   - `affects:user:carol`
3. All three receive notifications
4. Each has 7 days to respond
5. Once all respond (or timeout), proceed
6. Add `charter-compliant` label

### Example 5: Major Change Affecting Someone + Council Review

You're changing Alice's component AND want council input:

1. Create PR
2. Add labels:
   - `affects:user:alice`
   - `council-review`
3. Both processes run in parallel
4. Alice's veto right is protected regardless of council opinion
5. Consider council feedback
6. Document decisions
7. Add both `sovereignty-protected` and `charter-compliant` labels

## Workflow Details

### Individual Veto Process

**Timeline**: 7 days for response

**Steps**:
1. PR is labeled with `affects:user:<username>`
2. Automated notification (if workflow enabled) or manual ping
3. Individual reviews the change
4. Individual responds:
   - **Approve**: Comment "Approved" or similar
   - **Request Changes**: Provide specific feedback
   - **Veto**: Comment "Veto" with reasoning
5. PR status is updated accordingly

**Timeout Behavior**: After 7 days of no response, the change may proceed (silence is not consent, but also not veto).

### Council Advisory Process

**Timeline**: 5 days for feedback

**Steps**:
1. PR is labeled with `council-review`
2. Council members are notified
3. Council members review and provide feedback in comments
4. Feedback is non-binding - it's advisory input
5. Repository owner considers feedback
6. Decision is made and rationale documented
7. PR proceeds per owner's decision

**Quorum**: No quorum required - feedback from any council member is valued

**Blocking**: Council review is NOT blocking - it's advisory only

## Best Practices

### When to Use Governance Labels

**DO use governance labels when**:
- Changing code owned by a specific person
- Modifying personal configurations or settings
- Making significant architectural decisions
- Seeking experienced perspective on complex changes
- Protecting personal boundaries

**DON'T use governance labels for**:
- Routine bug fixes
- Documentation updates (unless they affect someone specifically)
- Adding new features that don't affect existing code
- Your own code changes

### Communication

- Be clear and respectful in all governance discussions
- Provide reasoning for vetoes and modification requests
- Document decisions with rationale
- Keep discussions focused on the technical/governance matter
- Respect timeout periods - people need time to review

### Documentation

Every governance decision should include:
- What was decided
- Why it was decided that way
- Who was involved
- What feedback was considered

This can be as simple as a comment on the PR.

## Configuration Files

### `.hivemind/charter.yaml`

Machine-readable policy configuration. Defines:
- Enabled governance mechanisms
- Timeout periods
- Label patterns
- Workflow settings

Edit this file to customize governance for your repository.

### `.hivemind/council.json`

Council membership list. Contains:
- Current council members (GitHub usernames)
- Emeritus members
- Membership criteria and responsibilities

Edit this file to add/remove council members.

### `docs/HIVEMIND_CHARTER.md`

The full Charter document. This is the authoritative source for:
- Governance principles
- Rights and responsibilities
- Processes and procedures
- Spirit and intent

Read this first to understand the philosophy behind the governance system.

## Automation (Optional)

The governance system can be partially automated with GitHub Actions:

### Suggested Workflows

1. **Auto-notify on label**: Send notifications when governance labels are added
2. **Status comments**: Automatically post status updates
3. **Timeout reminders**: Remind users when response periods are expiring
4. **Audit logging**: Log all governance actions to `.hivemind/audit.log`

**Note**: Automation is optional - the system works with manual processes too.

## Audit Trail

All governance actions should leave an audit trail:

- PR comments documenting decisions
- Labels showing governance state
- Optional: `.hivemind/audit.log` for automated logging

## Conflict Resolution

If conflicts arise:

1. **First**: Attempt direct, respectful dialogue in PR comments
2. **Second**: Request council mediation by mentioning members
3. **Final**: Repository owner makes determination

All parties always retain the right to withdraw participation.

## Amendments to This Guide

This guide can be updated to reflect:
- Lessons learned from usage
- Community feedback
- Process improvements
- Clarifications

Significant changes should follow the Charter amendment process.

## Questions and Support

### Where to ask questions

- Open an issue with label `governance-question`
- Comment on PRs with governance labels
- Reach out to council members

### How to propose improvements

1. Open an issue describing the proposed change
2. Add label `charter-amendment` or `governance-improvement`
3. Community discusses
4. Follow Charter amendment process if needed

## Summary

The HiveMind governance system is:

✅ **Opt-in**: Only used when labels are applied  
✅ **Lightweight**: Minimal overhead for routine work  
✅ **Flexible**: Adapts to your needs  
✅ **Protective**: Guards individual sovereignty  
✅ **Advisory**: Council provides wisdom, not mandates  
✅ **Transparent**: All decisions are documented  

**Remember**: The goal is to enable collaboration while protecting autonomy. Use governance when it helps, skip it when it doesn't.

---

**Related Documents**:
- [HiveMind Charter](HIVEMIND_CHARTER.md) - Full governance principles
- [Charter Configuration](.hivemind/charter.yaml) - Machine-readable policy
- [Council Membership](.hivemind/council.json) - Council member list
