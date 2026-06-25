package com.xekho.pos.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.Saver
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.xekho.pos.AppBrand
import com.xekho.pos.auth.AuthRepository
import com.xekho.pos.auth.AuthSession
import com.xekho.pos.auth.AuthStage
import com.xekho.pos.auth.FakeAuthRepository
import com.xekho.pos.domain.DashboardSnapshot
import com.xekho.pos.domain.FakeDashboardRepository
import com.xekho.pos.domain.InventoryItem
import com.xekho.pos.domain.NativeTab
import com.xekho.pos.domain.TableOverview
import com.xekho.pos.ui.theme.XekhoTheme

private val authSessionSaver: Saver<AuthSession, List<String?>> = Saver(
    save = { session ->
        listOf(
            session.stage.name,
            session.staffName,
            session.errorMessage,
            session.isLocalOnly.toString()
        )
    },
    restore = { saved ->
        AuthSession(
            stage = AuthStage.valueOf(saved[0] ?: AuthStage.LOCKED.name),
            staffName = saved[1],
            errorMessage = saved[2],
            isLocalOnly = saved.getOrNull(3)?.toBooleanStrictOrNull() ?: true
        )
    }
)

@Composable
fun AppRoot(
    modifier: Modifier = Modifier,
    snapshot: DashboardSnapshot = remember { FakeDashboardRepository().loadSnapshot() },
    authRepository: AuthRepository = remember { FakeAuthRepository() }
) {
    var authSession by rememberSaveable(stateSaver = authSessionSaver) {
        mutableStateOf(authRepository.initialSession())
    }

    if (!authSession.canAccessPosTabs) {
        AuthGateScreen(
            modifier = modifier,
            authSession = authSession,
            onPinSubmit = { pin -> authSession = authRepository.verifyPin(pin, authSession) }
        )
        return
    }

    MainDashboard(
        modifier = modifier,
        snapshot = snapshot,
        authSession = authSession,
        onLock = { authSession = authRepository.lock(authSession) }
    )
}

@Composable
private fun AuthGateScreen(
    modifier: Modifier = Modifier,
    authSession: AuthSession,
    onPinSubmit: (String) -> Unit
) {
    var pin by remember { mutableStateOf("") }

    Surface(
        modifier = modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(MaterialTheme.colorScheme.background)
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = AppBrand.appName,
                color = MaterialTheme.colorScheme.primary,
                style = MaterialTheme.typography.headlineLarge,
                fontWeight = FontWeight.Bold
            )
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Kh\u00f3a POS native \u00b7 fake auth local-only",
                color = MaterialTheme.colorScheme.onBackground,
                style = MaterialTheme.typography.bodyLarge
            )
            Spacer(modifier = Modifier.height(20.dp))
            OutlinedTextField(
                value = pin,
                onValueChange = { pin = it.take(8) },
                label = { Text("PIN demo") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                supportingText = { Text("Demo PIN: 1234. Ch\u01b0a k\u1ebft n\u1ed1i Firebase Auth.") }
            )
            if (authSession.errorMessage != null) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = authSession.errorMessage,
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = { onPinSubmit(pin) }) {
                Text("M\u1edf kh\u00f3a local")
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "An to\u00e0n: m\u00e0n n\u00e0y kh\u00f4ng \u0111\u1ecdc .env, service account, Firestore hay POS production data.",
                color = MaterialTheme.colorScheme.secondary,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

@Composable
private fun MainDashboard(
    modifier: Modifier = Modifier,
    snapshot: DashboardSnapshot,
    authSession: AuthSession,
    onLock: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(NativeTab.TABLES) }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                snapshot.tabs.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Text(text = tab.label.take(1)) },
                        label = { Text(text = tab.label) }
                    )
                }
            }
        }
    ) { paddingValues ->
        Surface(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues),
            color = MaterialTheme.colorScheme.background
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(MaterialTheme.colorScheme.background)
                    .padding(20.dp)
            ) {
                Header(snapshot = snapshot, authSession = authSession, onLock = onLock)
                Spacer(modifier = Modifier.height(16.dp))
                when (selectedTab) {
                    NativeTab.TABLES -> TablesScreen(snapshot.tables)
                    NativeTab.INVENTORY -> InventoryScreen(snapshot.inventory)
                    NativeTab.FINANCE -> FinanceScreen(snapshot)
                    NativeTab.SETTINGS -> SettingsScreen()
                }
            }
        }
    }
}

@Composable
private fun Header(snapshot: DashboardSnapshot, authSession: AuthSession, onLock: () -> Unit) {
    Column {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = AppBrand.appName,
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.Bold
                )
                Text(
                    text = "${authSession.staffName ?: "Local staff"} \u00b7 fake data only \u00b7 no Firebase writes",
                    color = MaterialTheme.colorScheme.onBackground,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            TextButton(onClick = onLock) {
                Text("Kh\u00f3a")
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            StatCard("Doanh thu", formatVnd(snapshot.finance.todayRevenue), Modifier.weight(1f))
            StatCard("\u0110\u01a1n m\u1edf", snapshot.finance.openOrders.toString(), Modifier.weight(1f))
            StatCard("Kho c\u1ea7n nh\u1eadp", snapshot.finance.lowStockCount.toString(), Modifier.weight(1f))
        }
    }
}

@Composable
private fun StatCard(label: String, value: String, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primary.copy(alpha = 0.18f))
    ) {
        Column(modifier = Modifier.padding(10.dp)) {
            Text(text = label, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.secondary)
            Text(text = value, style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onBackground)
        }
    }
}

@Composable
private fun TablesScreen(tables: List<TableOverview>) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(tables) { table ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = table.label, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(text = table.status.displayName, style = MaterialTheme.typography.bodyMedium)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(horizontalAlignment = Alignment.End) {
                        Text(text = formatVnd(table.total), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold)
                        Text(text = "${table.itemCount} m\u00f3n", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}

@Composable
private fun InventoryScreen(items: List<InventoryItem>) {
    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(items) { item ->
            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Column(modifier = Modifier.fillMaxWidth().padding(14.dp)) {
                    Text(text = item.name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(text = "${item.currentQty} ${item.unit} \u00b7 ${item.status.displayName}")
                }
            }
        }
    }
}

@Composable
private fun FinanceScreen(snapshot: DashboardSnapshot) {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("T\u00e0i ch\u00ednh h\u00f4m nay", "Doanh thu fake: ${formatVnd(snapshot.finance.todayRevenue)}")
        SectionCard("POS dry-run", "Gi\u1ecf h\u00e0ng m\u1eabu: ${formatVnd(snapshot.draft.total)} · ch\u01b0a cho ghi production")
    }
}

@Composable
private fun SettingsScreen() {
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        SectionCard("Tr\u1ea1ng th\u00e1i", "Sprint 5: Firebase Auth SDK dependency prepared, but real Firebase Auth/Firestore v\u1eabn b\u1ecb guard ch\u1eb7n.")
        SectionCard("An to\u00e0n", "Kh\u00f4ng service account, kh\u00f4ng .env, kh\u00f4ng POS production data trong APK n\u00e0y.")
    }
}

@Composable
private fun SectionCard(title: String, body: String) {
    Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
            Text(text = title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(6.dp))
            Text(text = body, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

private fun formatVnd(value: Long): String = "%,d\u0111".format(value)

@Preview(showBackground = true, widthDp = 390, heightDp = 844)
@Composable
private fun AppRootPreview() {
    XekhoTheme {
        AppRoot()
    }
}
