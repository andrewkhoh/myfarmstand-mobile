** Implementations Guidelines
Follow the development plan in development-plan.md to implement any increment
Review the deliverables in actual-deliverables.md
Review the lessons learned in lessons-learned.md.
Do not repeat the same mistakes in lessons learned
Document your findings in lessons-learned.md
Document your deliverables in actual-deliverables.md
Move any test screens to src/screens/testScreens
Move any test navigation to src/navigation/TestStackNavigator.tsx
Use React-Query for all data fetching and mutations and follow the patterns in lessons-learned.md
Use try/catch block for react-query .mutateAsync operations
Create automated tests and integrate all automated tests into the test runner
Use consistent react-query patterns for subscription, mutations, queries through out the code base; check that this is being followed.
Use consistent query keys for react-query.
Fix all errors before stopping and making conclusions of 'DONE'.

** Continuous Improvements
Review any todos / reminders from previous increments in actual-deliverables.md
Relook at any documented ambiguities and 'gaps' in the actual-deliverables.md
Suggest next steps / actions to complete the todos or close the gaps.