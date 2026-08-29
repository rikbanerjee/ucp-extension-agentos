export interface VerificationSnapshot {
  verifiedAt: string;
  testsPassed: number;
  testsTotal: number;
  buildStatus: 'passing' | 'failing';
  typecheckStatus: 'passing' | 'failing';
  knownLimitations: string[];
}

/**
 * Single public verification snapshot. Refresh only after running the root
 * verification commands; product claims must not infer live-service status.
 */
export const VERIFICATION_SNAPSHOT: VerificationSnapshot = {
  verifiedAt: '2026-08-19',
  testsPassed: 486,
  testsTotal: 486,
  buildStatus: 'passing',
  typecheckStatus: 'passing',
  knownLimitations: [
    'No hosted live transport, persistence, production multi-tenancy, agent authentication or rate limiting.',
    'Provider-supplied delivery windows, courier capacity, route selection and multi-stop fulfilment are not implemented.',
  ],
};

export const verificationTestLabel = `${VERIFICATION_SNAPSHOT.testsPassed}/${VERIFICATION_SNAPSHOT.testsTotal}`;
