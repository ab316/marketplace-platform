# UC-XXX: <Use Case Title>

Owner: <module/team>  
Status: Draft | Approved | Implemented  
Surfaces: API, Web (which of these the actor uses; a person always needs Web — see the index)  
Last updated: YYYY-MM-DD

<!--
Sizing rule (docs/product/product-operating-model.md, "Use case sizing"): one primary actor
achieving one goal from one trigger. If the title needs an "and", if flows need letter prefixes
(C1, M1, A1), or if one part could ship and be marked Implemented while another is not, write
separate use cases that link to each other. UC-003 is the counter-example this rule comes from.
-->

## Goal

A single sentence describing what the actor achieves. If you cannot write it without "and", split the use case.

## Primary Actor

- <Customer/Admin/System> — exactly one. Supporting actors go under Stakeholders.

## Stakeholders

- ...

## Preconditions

- ...

## Trigger

- ...

## Main Flow

1. ...
2. ...
3. ...

## Alternate / Error Flows

### A1: <Name>

- Condition:
- Steps:
- Outcome:

### E1: <Name>

- Condition:
- Steps:
- Outcome:

## Postconditions

- ...

## Data / Validations

- Inputs:
- Rules:
- Outputs:

## Observability

- Logs:
- Metrics:
- Traces:

## Security / Compliance

- Auth:
- Authorization:
- Audit:

## Mapping to Architecture (Optional but recommended)

- Commands:
  - <Module>.<CommandName>
- Queries:
  - <Module>.<QueryName>
- Domain Events:
  - <DomainEvent>
- Integration Events:
  - <IntegrationEvent>.v1
- Persistence:
  - tables: <...>
