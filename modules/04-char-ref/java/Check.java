/**
 * A tiny, zero-dependency assertion harness. Exists so every module can be
 * compiled and run with nothing but `javac` and `java` — no JUnit, no
 * Maven, no Gradle. Reused, unmodified, by every future module's java/ dir.
 */
public class Check {
    static int passed = 0;
    static int failed = 0;

    static void that(String description, boolean condition) {
        if (condition) {
            passed++;
            System.out.println("  PASS - " + description);
        } else {
            failed++;
            System.out.println("  FAIL - " + description);
        }
    }

    static void throwsWithModule(String description, Runnable action, int expectedModule) {
        try {
            action.run();
            that(description + " (expected an exception, got none)", false);
        } catch (NotImplementedException e) {
            that(description, e.moduleNumber == expectedModule);
        }
    }

    static void summary() {
        System.out.println();
        System.out.println(passed + " passed, " + failed + " failed");
        if (failed > 0) {
            System.exit(1);
        }
    }
}
