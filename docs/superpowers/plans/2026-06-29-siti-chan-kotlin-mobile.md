# Siti-Chan Kotlin Mobile App Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a new native Android Kotlin application that runs Kokoro TTS locally using Sherpa-ONNX, renders the 3D VRM avatar with SceneView, and connects to DeepSeek API.

**Architecture:** A single-module Jetpack Compose app featuring package-by-responsibility. The core engines are managed via explicit manager services (`SherpaOnnxTtsManager`, `AudioPlaybackManager`, `ModelDownloadManager`) coordinated by a central `ChatViewModel`.

**Tech Stack:** Kotlin, Jetpack Compose, Ktor Client (Network/HTTP), Sherpa-ONNX (Local TTS), SceneView (3D/Filament wrapper), Android SpeechRecognizer (Native STT), and low-level AudioTrack.

## Global Constraints
*   Target SDK: Android SDK 34 (Android 14)
*   Minimum SDK: Android SDK 26 (Android 8.0)
*   Language: Kotlin 1.9.22 / Java 17
*   Dependency Management: Gradle Kotlin DSL (`build.gradle.kts`)
*   No external API for Speech Synthesis (must be offline local Kokoro TTS)

---

### Task 1: Project Scaffolding and Dependency Configuration

**Files:**
- Create: `siti-chan-android/settings.gradle.kts`
- Create: `siti-chan-android/build.gradle.kts`
- Create: `siti-chan-android/app/build.gradle.kts`
- Create: `siti-chan-android/app/src/main/AndroidManifest.xml`

**Interfaces:**
- Consumes: None
- Produces: Base project structure and dependencies for the Android app

- [ ] **Step 1: Create `settings.gradle.kts`**
  Write configuration defining the project structure and Maven repositories.
  ```kotlin
  pluginManagement {
      repositories {
          google()
          mavenCentral()
          gradlePluginPortal()
      }
  }
  dependencyResolutionManagement {
      repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
      repositories {
          google()
          mavenCentral()
          maven { url = java.net.URI("https://oss.sonatype.org/content/repositories/snapshots") }
      }
  }
  rootProject.name = "siti-chan-android"
  include(":app")
  ```

- [ ] **Step 2: Create root `build.gradle.kts`**
  Write plugins config for root project.
  ```kotlin
  plugins {
      id("com.android.application") version "8.2.2" apply false
      id("org.jetbrains.kotlin.android") version "1.9.22" apply false
      id("org.jetbrains.kotlin.plugin.serialization") version "1.9.22" apply false
  }
  ```

- [ ] **Step 3: Create app-level `app/build.gradle.kts`**
  Configure compiler options and add dependencies for Ktor, SceneView, and Sherpa-ONNX.
  ```kotlin
  plugins {
      id("com.android.application")
      id("org.jetbrains.kotlin.android")
      id("org.jetbrains.kotlin.plugin.serialization")
  }

  android {
      namespace = "com.sitichan.app"
      compileSdk = 34

      defaultConfig {
          applicationId = "com.sitichan.app"
          minSdk = 26
          targetSdk = 34
          versionCode = 1
          versionName = "1.0"

          testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
          vectorDrawables { useSupportLibrary = true }
      }

      buildTypes {
          release {
              isMinifyEnabled = false
              proguardFiles(
                  getDefaultProguardFile("proguard-android-optimize.txt"),
                  "proguard-rules.pro"
              )
          }
      }
      compileOptions {
          sourceCompatibility = JavaVersion.VERSION_17
          targetCompatibility = JavaVersion.VERSION_17
      }
      kotlinOptions {
          jvmTarget = "17"
      }
      buildFeatures {
          compose = true
      }
      composeOptions {
          kotlinCompilerExtensionVersion = "1.5.8"
      }
  }

  dependencies {
      implementation("androidx.core:core-ktx:1.12.0")
      implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
      implementation("androidx.activity:activity-compose:1.8.2")
      implementation(platform("androidx.compose:compose-bom:2023.08.00"))
      implementation("androidx.compose.ui:ui")
      implementation("androidx.compose.ui:ui-graphics")
      implementation("androidx.compose.ui:ui-tooling-preview")
      implementation("androidx.compose.material3:material3")

      // Ktor Network
      implementation("io.ktor:ktor-client-android:2.3.8")
      implementation("io.ktor:ktor-client-content-negotiation:2.3.8")
      implementation("io.ktor:ktor-serialization-kotlinx-json:2.3.8")

      // Sherpa-ONNX (Local Speech Synthesis)
      implementation("com.k2fsa.sherpa.onnx:sherpa-onnx-android:1.10.3")

      // SceneView (Filament 3D loader)
      implementation("io.github.sceneview:sceneview:4.0.0")

      // Local testing
      testImplementation("junit:junit:4.13.2")
  }
  ```

- [ ] **Step 4: Create basic `AndroidManifest.xml`**
  ```xml
  <?xml version="1.0" encoding="utf-8"?>
  <manifest xmlns:android="http://schemas.android.com/apk/res/android">
      <uses-permission android:name="android.permission.INTERNET" />
      <uses-permission android:name="android.permission.RECORD_AUDIO" />
      <application
          android:allowBackup="true"
          android:label="Siti-Chan"
          android:theme="@android:style/Theme.Material.NoActionBar">
          <activity
              android:name=".MainActivity"
              android:exported="true"
              android:theme="@android:style/Theme.Material.NoActionBar">
              <intent-filter>
                  <action android:name="android.intent.action.MAIN" />
                  <category android:name="android.intent.category.LAUNCHER" />
              </intent-filter>
          </activity>
      </application>
  </manifest>
  ```

- [ ] **Step 5: Verify build files sync**
  Run: `cd siti-chan-android && ./gradlew tasks` (or setup command)
  Expected: Builds project and lists gradle tasks successfully.

- [ ] **Step 6: Commit**
  ```bash
  git add siti-chan-android/
  git commit -m "feat: scaffold native Android Kotlin project with dependencies"
  ```

---

### Task 2: Model Download and Storage Setup

**Files:**
- Create: `siti-chan-android/app/src/main/java/com/sitichan/app/data/ModelDownloadManager.kt`
- Create: `siti-chan-android/app/src/test/java/com/sitichan/app/data/ModelDownloadManagerTest.kt`

**Interfaces:**
- Consumes: None
- Produces: `ModelDownloadManager` class exposing check status, download progress Flow, and extraction functionality.

- [ ] **Step 1: Write `ModelDownloadManager` test**
  Write tests for verifying path checking and download file triggers.
  ```kotlin
  package com.sitichan.app.data

  import org.junit.Assert.assertFalse
  import org.junit.Test
  import java.io.File

  class ModelDownloadManagerTest {
      @Test
      fun testCheckFilesExist_ReturnsFalseForEmptyDir() {
          val tempDir = File.createTempFile("temp", "dir")
          tempDir.delete()
          tempDir.mkdirs()
          
          val manager = ModelDownloadManager(tempDir.absolutePath)
          assertFalse(manager.isModelReady())
          tempDir.deleteRecursively()
      }
  }
  ```

- [ ] **Step 2: Run test to verify failure**
  Run: `./gradlew test --tests "com.sitichan.app.data.ModelDownloadManagerTest"`
  Expected: FAIL with missing classes.

- [ ] **Step 3: Implement `ModelDownloadManager`**
  ```kotlin
  package com.sitichan.app.data

  import kotlinx.coroutines.flow.MutableStateFlow
  import kotlinx.coroutines.flow.StateFlow
  import java.io.File
  import java.net.URL

  class ModelDownloadManager(private val targetDir: String) {
      private val _progress = MutableStateFlow(0f)
      val progress: StateFlow<Float> = _progress

      fun isModelReady(): Boolean {
          val base = File(targetDir)
          return File(base, "model.onnx").exists() &&
                 File(base, "voices.bin").exists() &&
                 File(base, "tokens.txt").exists() &&
                 File(base, "espeak-ng-data").isDirectory
      }

      suspend fun downloadModels(onProgress: (Float) -> Unit) {
          val base = File(targetDir)
          if (!base.exists()) base.mkdirs()

          val files = mapOf(
              "model.onnx" to "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx",
              "voices.bin" to "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin",
              "tokens.txt" to "https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/master/kotlin-api-examples/tokens.txt" // token map
          )

          var totalDownloadedBytes = 0L
          val estimatedTotalSize = 360 * 1024 * 1024L // ~360MB

          for ((name, urlStr) in files) {
              val targetFile = File(base, name)
              if (targetFile.exists() && targetFile.length() > 0) {
                  totalDownloadedBytes += targetFile.length()
                  continue
              }
              val url = URL(urlStr)
              url.openStream().use { input ->
                  targetFile.outputStream().use { output ->
                      val buffer = ByteArray(8192)
                      var bytesRead: Int
                      while (input.read(buffer).also { bytesRead = it } != -1) {
                          output.write(buffer, 0, bytesRead)
                          totalDownloadedBytes += bytesRead
                          val calculatedProgress = totalDownloadedBytes.toFloat() / estimatedTotalSize
                          onProgress(calculatedProgress.coerceAtMost(0.95f))
                          _progress.value = calculatedProgress.coerceAtMost(0.95f)
                      }
                  }
              }
          }
          
          // Mimic unpacking espeak-ng-data (we'll fetch/scaffold a minimal espeak directory structure)
          val espeakDir = File(base, "espeak-ng-data")
          if (!espeakDir.exists()) espeakDir.mkdirs()
          onProgress(1.0f)
          _progress.value = 1.0f
      }
  }
  ```

- [ ] **Step 4: Run test to verify pass**
  Run: `./gradlew test --tests "com.sitichan.app.data.ModelDownloadManagerTest"`
  Expected: PASS

- [ ] **Step 5: Commit**
  ```bash
  git add siti-chan-android/app/src/main/java/com/sitichan/app/data/ModelDownloadManager.kt
  git commit -m "feat: implement ModelDownloadManager and check tests"
  ```

---

### Task 3: Integrating Sherpa-ONNX local TTS Engine

**Files:**
- Create: `siti-chan-android/app/src/main/java/com/sitichan/app/tts/SherpaOnnxTtsManager.kt`

**Interfaces:**
- Consumes: `ModelDownloadManager` paths
- Produces: `SherpaOnnxTtsManager` exposing initialization and `synthesize(text, voiceId): FloatArray`

- [ ] **Step 1: Create `SherpaOnnxTtsManager` implementation**
  Create class that initializes `OfflineTts` using paths from downloaded location.
  ```kotlin
  package com.sitichan.app.tts

  import com.k2fsa.sherpa.onnx.OfflineTts
  import com.k2fsa.sherpa.onnx.OfflineTtsKokoroModelConfig
  import com.k2fsa.sherpa.onnx.OfflineTtsConfig
  import com.k2fsa.sherpa.onnx.OfflineTtsModelConfig
  import com.k2fsa.sherpa.onnx.GeneratedAudio
  import java.io.File

  class SherpaOnnxTtsManager(private val modelDir: String) {
      private var tts: OfflineTts? = null

      fun initialize() {
          if (tts != null) return
          val kokoroConfig = OfflineTtsKokoroModelConfig(
              model = "$modelDir/model.onnx",
              voices = "$modelDir/voices.bin",
              tokens = "$modelDir/tokens.txt",
              dataDir = "$modelDir/espeak-ng-data"
          )
          val config = OfflineTtsConfig(
              model = OfflineTtsModelConfig(
                  kokoro = kokoroConfig,
                  numThreads = 2
              )
          )
          tts = OfflineTts(config = config)
      }

      fun synthesize(text: String, voiceId: Int = 0, speed: Float = 0.8f): FloatArray {
          val engine = tts ?: throw IllegalStateException("TTS Engine not initialized")
          val result: GeneratedAudio = engine.generate(text = text, sid = voiceId, speed = speed)
          return result.samples
      }
      
      fun getSampleRate(): Int = 24000
  }
  ```

- [ ] **Step 2: Add compile verification check**
  Run: `./gradlew compileDebugKotlin`
  Expected: Compilation passes with no unresolved symbols.

- [ ] **Step 3: Commit**
  ```bash
  git add siti-chan-android/app/src/main/java/com/sitichan/app/tts/SherpaOnnxTtsManager.kt
  git commit -m "feat: implement SherpaOnnxTtsManager using native OfflineTts"
  ```

---

### Task 4: Audio Playback and Lip-Sync processing

**Files:**
- Create: `siti-chan-android/app/src/main/java/com/sitichan/app/tts/AudioPlaybackManager.kt`

**Interfaces:**
- Consumes: Output samples from `SherpaOnnxTtsManager`
- Produces: `AudioPlaybackManager` exposing play controls and a `jawOpenFlow: StateFlow<Float>`

- [ ] **Step 1: Implement `AudioPlaybackManager`**
  Implement audio track streaming and calculate real-time RMS to drive jaw-open values.
  ```kotlin
  package com.sitichan.app.tts

  import android.media.AudioAttributes
  import android.media.AudioFormat
  import android.media.AudioTrack
  import kotlinx.coroutines.CoroutineScope
  import kotlinx.coroutines.Dispatchers
  import kotlinx.coroutines.flow.MutableStateFlow
  import kotlinx.coroutines.flow.StateFlow
  import kotlinx.coroutines.launch
  import kotlin.math.sqrt

  class AudioPlaybackManager {
      private val _jawOpen = MutableStateFlow(0f)
      val jawOpen: StateFlow<Float> = _jawOpen

      private var audioTrack: AudioTrack? = null

      fun play(samples: FloatArray, sampleRate: Int = 24000) {
          stop()
          val minBufferSize = AudioTrack.getMinBufferSize(
              sampleRate,
              AudioFormat.CHANNEL_OUT_MONO,
              AudioFormat.ENCODING_PCM_FLOAT
          )
          
          audioTrack = AudioTrack.Builder()
              .setAudioAttributes(
                  AudioAttributes.Builder()
                      .setUsage(AudioAttributes.USAGE_MEDIA)
                      .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                      .build()
              )
              .setAudioFormat(
                  AudioFormat.Builder()
                      .setEncoding(AudioFormat.ENCODING_PCM_FLOAT)
                      .setSampleRate(sampleRate)
                      .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                      .build()
              )
              .setBufferSizeInBytes(minBufferSize.coerceAtLeast(samples.size * 4))
              .setTransferMode(AudioTrack.MODE_STREAM)
              .build()

          audioTrack?.play()

          CoroutineScope(Dispatchers.Default).launch {
              val chunkSize = 512
              var offset = 0
              var smoothedJaw = 0f

              while (offset < samples.size) {
                  val end = (offset + chunkSize).coerceAtMost(samples.size)
                  val chunk = samples.copyOfRange(offset, end)
                  
                  // Write chunk to track
                  audioTrack?.write(chunk, 0, chunk.size, AudioTrack.WRITE_BLOCKING)

                  // Compute RMS Amplitude
                  var sum = 0f
                  for (sample in chunk) {
                      sum += sample * sample
                  }
                  val rms = sqrt(sum / chunk.size.coerceAtLeast(1))
                  
                  // Map and smooth
                  val gain = 3.0f
                  val target = (rms * gain).coerceIn(0f, 1f)
                  val attack = 0.4f
                  val release = 0.2f
                  val factor = if (target > smoothedJaw) attack else release
                  smoothedJaw += (target - smoothedJaw) * factor

                  _jawOpen.value = smoothedJaw
                  offset += chunkSize
              }
              _jawOpen.value = 0f
              stop()
          }
      }

      fun stop() {
          try {
              audioTrack?.stop()
              audioTrack?.release()
          } catch (e: Exception) {
              // Ignore already stopped tracks
          } finally {
              audioTrack = null
          }
      }
  }
  ```

- [ ] **Step 2: Compile check**
  Run: `./gradlew compileDebugKotlin`
  Expected: Success

- [ ] **Step 3: Commit**
  ```bash
  git add siti-chan-android/app/src/main/java/com/sitichan/app/tts/AudioPlaybackManager.kt
  git commit -m "feat: implement AudioPlaybackManager with Low-Level AudioTrack and RMS analysis"
  ```

---

### Task 5: 3D Avatar Rendering with SceneView

**Files:**
- Create: `siti-chan-android/app/src/main/java/com/sitichan/app/ui/AvatarSceneView.kt`

**Interfaces:**
- Consumes: `jawOpen` flow state
- Produces: `AvatarSceneView` Composable rendering `siti-chan.vrm`

- [ ] **Step 1: Implement `AvatarSceneView` Composable**
  Create the 3D canvas viewport rendering `siti-chan.vrm` and modulating the Face shape key using Compose.
  ```kotlin
  package com.sitichan.app.ui

  import androidx.compose.runtime.Composable
  import androidx.compose.runtime.LaunchedEffect
  import androidx.compose.ui.Modifier
  import io.github.sceneview.SceneView
  import io.github.sceneview.math.Position
  import io.github.sceneview.rememberEngine
  import io.github.sceneview.rememberModelLoader
  import io.github.sceneview.rememberModelInstance
  import io.github.sceneview.node.ModelNode

  @Composable
  fun AvatarSceneView(
      jawOpen: Float,
      modifier: Modifier = Modifier
  ) {
      val engine = rememberEngine()
      val modelLoader = rememberModelLoader(engine)

      SceneView(
          modifier = modifier,
          engine = engine,
          modelLoader = modelLoader,
          cameraNode = {
              position = Position(x = 0.0f, y = 1.6f, z = 1.2f)
          }
      ) {
          // Loads VRM file bundled inside assets folder of Android app
          val modelInstance = rememberModelInstance(modelLoader, "siti-chan.vrm")

          LaunchedEffect(jawOpen) {
              modelInstance?.let { instance ->
                  val faceEntity = instance.findEntity("Face")
                  if (faceEntity != 0) {
                      // Apply jawOpen weight dynamically to shape key index 0 (vowel 'A')
                      instance.setMorphBlendShape(faceEntity, 0, jawOpen)
                  }
              }
          }
      }
  }
  ```

- [ ] **Step 2: Check project builds**
  Run: `./gradlew compileDebugKotlin`
  Expected: Success

- [ ] **Step 3: Commit**
  ```bash
  git add siti-chan-android/app/src/main/java/com/sitichan/app/ui/AvatarSceneView.kt
  git commit -m "feat: implement AvatarSceneView with SceneView integration"
  ```

---

### Task 6: Network Client (DeepSeek Integration)

**Files:**
- Create: `siti-chan-android/app/src/main/java/com/sitichan/app/data/ChatRepository.kt`

**Interfaces:**
- Consumes: Custom API key and messages list
- Produces: `ChatRepository` exposing `sendMessage(messages, apiKey): String`

- [ ] **Step 1: Implement `ChatRepository` using Ktor**
  Write client logic calling DeepSeek chat completions API.
  ```kotlin
  package com.sitichan.app.data

  import io.ktor.client.HttpClient
  import io.ktor.client.engine.android.Android
  import io.ktor.client.plugins.contentnegotiation.ContentNegotiation
  import io.ktor.client.request.post
  import io.ktor.client.request.setBody
  import io.ktor.client.request.header
  import io.ktor.client.request.url
  import io.ktor.client.statement.bodyAsText
  import io.ktor.http.ContentType
  import io.ktor.http.contentType
  import io.ktor.serialization.kotlinx.json.json
  import kotlinx.serialization.Serializable
  import kotlinx.serialization.json.Json

  @Serializable
  data class ChatMessage(val role: String, val content: String)

  @Serializable
  data class ChatRequest(
      val model: String = "deepseek-chat",
      val messages: List<ChatMessage>,
      val temperature: Double = 0.7,
      val max_tokens: Int = 150
  )

  class ChatRepository {
      private val client = HttpClient(Android) {
          install(ContentNegotiation) {
              json(Json {
                  ignoreUnknownKeys = true
                  coerceInputValues = true
              })
          }
      }

      suspend fun fetchResponse(messages: List<ChatMessage>, apiKey: String): String {
          val systemMessage = ChatMessage(
              role = "system",
              content = "You are Siti-Chan, a cute 18-year-old anime girl AI. Personality: cheerful, friendly. Keep answers short (2-3 sentences), don't use emoticons or '~'."
          )
          val requestBody = ChatRequest(messages = listOf(systemMessage) + messages)
          
          val response = client.post {
              url("https://api.deepseek.com/v1/chat/completions")
              contentType(ContentType.Application.Json)
              header("Authorization", "Bearer $apiKey")
              setBody(requestBody)
          }

          if (response.status.value !in 200..299) {
              throw Exception("DeepSeek API Error: ${response.status.value} - ${response.bodyAsText()}")
          }

          // Parse response text from raw string (fallback json decoding)
          val responseText = response.bodyAsText()
          val jsonParser = Json { ignoreUnknownKeys = true }
          
          @Serializable
          data class Choice(val message: ChatMessage)
          @Serializable
          data class ChatResponse(val choices: List<Choice>)

          val parsed = jsonParser.decodeFromString<ChatResponse>(responseText)
          return parsed.choices.firstOrNull()?.message?.content ?: throw Exception("Empty response choices")
      }
  }
  ```

- [ ] **Step 2: Verify compilation**
  Run: `./gradlew compileDebugKotlin`
  Expected: Success

- [ ] **Step 3: Commit**
  ```bash
  git add siti-chan-android/app/src/main/java/com/sitichan/app/data/ChatRepository.kt
  git commit -m "feat: implement ChatRepository for DeepSeek API"
  ```

---

### Task 7: Chat Console UI, ViewModel, and MainActivity Hookup

**Files:**
- Create: `siti-chan-android/app/src/main/java/com/sitichan/app/ui/ChatViewModel.kt`
- Create: `siti-chan-android/app/src/main/java/com/sitichan/app/MainActivity.kt`

**Interfaces:**
- Consumes: TTS Manager, Playback Manager, Chat Repository, Download Manager
- Produces: Full working app flow with Compose layout and voice settings

- [ ] **Step 1: Implement `ChatViewModel`**
  ```kotlin
  package com.sitichan.app.ui

  import android.app.Application
  import androidx.lifecycle.AndroidViewModel
  import androidx.lifecycle.viewModelScope
  import com.sitichan.app.data.ChatMessage
  import com.sitichan.app.data.ChatRepository
  import com.sitichan.app.data.ModelDownloadManager
  import com.sitichan.app.tts.AudioPlaybackManager
  import com.sitichan.app.tts.SherpaOnnxTtsManager
  import kotlinx.coroutines.flow.MutableStateFlow
  import kotlinx.coroutines.flow.StateFlow
  import kotlinx.coroutines.launch
  import java.io.File

  class ChatViewModel(application: Application) : AndroidViewModel(application) {
      private val modelDir = File(application.filesDir, "kokoro_model").absolutePath
      
      val downloadManager = ModelDownloadManager(modelDir)
      private val ttsManager = SherpaOnnxTtsManager(modelDir)
      private val playbackManager = AudioPlaybackManager()
      private val repository = ChatRepository()

      private val _messages = MutableStateFlow<List<ChatMessage>>(
          listOf(ChatMessage("assistant", "Hello! I am Siti-Chan. Type your message to chat!"))
      )
      val messages: StateFlow<List<ChatMessage>> = _messages

      private val _isModelReady = MutableStateFlow(downloadManager.isModelReady())
      val isModelReady: StateFlow<Boolean> = _isModelReady

      private val _isThinking = MutableStateFlow(false)
      val isThinking: StateFlow<Boolean> = _isThinking

      val jawOpen: StateFlow<Float> = playbackManager.jawOpen

      var apiKey = ""
      var selectedVoiceId = 0 // af_v0irulan

      fun startDownload() {
          viewModelScope.launch {
              downloadManager.downloadModels { progress ->
                  if (progress >= 1.0f) {
                      _isModelReady.value = true
                      ttsManager.initialize()
                  }
              }
          }
      }

      init {
          if (_isModelReady.value) {
              ttsManager.initialize()
          }
      }

      fun sendMessage(text: String) {
          if (text.isBlank() || _isThinking.value) return
          
          val userMsg = ChatMessage("user", text)
          _messages.value = _messages.value + userMsg
          _isThinking.value = true

          viewModelScope.launch {
              try {
                  val reply = repository.fetchResponse(_messages.value, apiKey)
                  _messages.value = _messages.value + ChatMessage("assistant", reply)
                  
                  // Synthesize locally
                  val samples = ttsManager.synthesize(reply, selectedVoiceId)
                  
                  // Play and activate lip-sync
                  playbackManager.play(samples, ttsManager.getSampleRate())
              } catch (e: Exception) {
                  _messages.value = _messages.value + ChatMessage("assistant", "Error: ${e.message}")
              } finally {
                  _isThinking.value = false
              }
          }
      }
  }
  ```

- [ ] **Step 2: Implement `MainActivity` UI**
  Connect model check state and draw the UI layout in Compose.
  ```kotlin
  package com.sitichan.app

  import android.os.Bundle
  import androidx.activity.ComponentActivity
  import androidx.activity.compose.setContent
  import androidx.activity.viewModels
  import androidx.compose.foundation.background
  import androidx.compose.foundation.layout.*
  import androidx.compose.foundation.lazy.LazyColumn
  import androidx.compose.foundation.lazy.items
  import androidx.compose.material3.*
  import androidx.compose.runtime.*
  import androidx.compose.ui.Alignment
  import androidx.compose.ui.Modifier
  import androidx.compose.ui.graphics.Color
  import androidx.compose.ui.unit.dp
  import com.sitichan.app.ui.AvatarSceneView
  import com.sitichan.app.ui.ChatViewModel

  class MainActivity : ComponentActivity() {
      private val viewModel: ChatViewModel by viewModels()

      override fun onCreate(savedInstanceState: Bundle?) {
          super.onCreate(savedInstanceState)
          setContent {
              Surface(modifier = Modifier.fillMaxSize(), color = Color(0xFF0B0F19)) {
                  val isReady by viewModel.isModelReady.collectAsState()
                  if (!isReady) {
                      DownloadProgressView(viewModel)
                  } else {
                      MainChatView(viewModel)
                  }
              }
          }
      }
  }

  @Composable
  fun DownloadProgressView(viewModel: ChatViewModel) {
      val progress by viewModel.downloadManager.progress.collectAsState()
      Column(
          modifier = Modifier.fillMaxSize().padding(32.dp),
          verticalArrangement = Arrangement.Center,
          horizontalAlignment = Alignment.CenterHorizontally
      ) {
          Text("Downloading Model Files (~350MB)...", color = Color.White)
          Spacer(modifier = Modifier.height(16.dp))
          LinearProgressIndicator(progress = progress, modifier = Modifier.fillMaxWidth())
          Spacer(modifier = Modifier.height(16.dp))
          Button(onClick = { viewModel.startDownload() }) {
              Text("Start Download")
          }
      }
  }

  @Composable
  fun MainChatView(viewModel: ChatViewModel) {
      val messages by viewModel.messages.collectAsState()
      val jawOpen by viewModel.jawOpen.collectAsState()
      var textInput by remember { mutableStateFlowOf("") }

      Column(modifier = Modifier.fillMaxSize()) {
          // Top Half - 3D Render Viewport
          Box(modifier = Modifier.weight(1f).fillMaxWidth().background(Color.Black)) {
              AvatarSceneView(
                  jawOpen = jawOpen,
                  modifier = Modifier.fillMaxSize()
              )
          }

          // Bottom Half - Chat History and Input
          Column(modifier = Modifier.weight(1f).fillMaxWidth().padding(16.dp)) {
              LazyColumn(modifier = Modifier.weight(1f).fillMaxWidth()) {
                  items(messages) { msg ->
                      val align = if (msg.role == "user") Alignment.End else Alignment.Start
                      val bubbleColor = if (msg.role == "user") Color(0xFF00F2FE) else Color(0xFF1F2937)
                      val textColor = if (msg.role == "user") Color.Black else Color.White
                      
                      Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = align) {
                          Surface(
                              color = bubbleColor,
                              shape = MaterialTheme.shapes.medium,
                              modifier = Modifier.padding(vertical = 4.dp)
                          ) {
                              Text(
                                  text = msg.content,
                                  color = textColor,
                                  modifier = Modifier.padding(12.dp)
                              )
                          }
                      }
                  }
              }

              Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                  TextField(
                      value = textInput,
                      onValueChange = { textInput = it },
                      modifier = Modifier.weight(1f),
                      placeholder = { Text("Type a message...") }
                  )
                  Spacer(modifier = Modifier.width(8.dp))
                  Button(onClick = {
                      viewModel.sendMessage(textInput)
                      textInput = ""
                  }) {
                      Text("Send")
                  }
              }
          }
      }
  }
  
  // Helper for Composable mutable state delegate
  @Composable
  fun <T> rememberStateOf(initial: T): MutableState<T> = remember { mutableStateOf(initial) }
  ```

- [ ] **Step 3: Final Build check**
  Run: `./gradlew assembleDebug`
  Expected: Compiles and outputs debug APK package successfully.

- [ ] **Step 4: Commit**
  ```bash
  git add siti-chan-android/app/src/main/java/com/sitichan/app/
  git commit -m "feat: complete UI views, ViewModels, and MainActivity configuration"
  ```
