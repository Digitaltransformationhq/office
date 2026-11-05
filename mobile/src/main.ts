// Evaluate the mobile adapter before mounting the shared application.
import './bridge';
import './push';
import '../../src/main';
// Load overrides after the shared app's styles.
import './mobile.css';
