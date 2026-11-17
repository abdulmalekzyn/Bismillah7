package com.bismillah.husoon;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Downloads lists of files (recitation audio) into the app's private "dl" folder.
 * Files that already exist are skipped, so an interrupted job simply resumes when started again.
 */
final class Downloader {
    interface Listener {
        void progress(String jobId, int done, int total, int failed, boolean finished);
    }

    private final File root;
    private final Listener listener;
    private final ExecutorService pool = Executors.newFixedThreadPool(4);
    private final Map<String, AtomicBoolean> cancelled = new ConcurrentHashMap<>();

    Downloader(File root, Listener listener) {
        this.root = root;
        this.listener = listener;
    }

    /** Resolves a relative path inside the download folder, or null if it tries to escape it. */
    File resolve(String path) {
        if (path == null || path.isEmpty() || path.contains("..") || path.startsWith("/")) return null;
        return new File(root, path);
    }

    void start(String jobId, String json) {
        final JSONArray items;
        try {
            items = new JSONArray(json);
        } catch (Exception e) {
            listener.progress(jobId, 0, 0, 0, true);
            return;
        }
        final int total = items.length();
        final AtomicBoolean stop = new AtomicBoolean(false);
        final AtomicInteger done = new AtomicInteger(), failed = new AtomicInteger();
        cancelled.put(jobId, stop);
        if (total == 0) {
            listener.progress(jobId, 0, 0, 0, true);
            return;
        }
        for (int i = 0; i < total; i++) {
            final JSONObject it = items.optJSONObject(i);
            pool.execute(() -> {
                if (!stop.get()) {
                    boolean ok = it != null && fetch(it.optString("u"), resolve(it.optString("p")));
                    if (!ok) failed.incrementAndGet();
                }
                int d = done.incrementAndGet();
                boolean fin = d == total;
                if (fin || d % 5 == 0) listener.progress(jobId, d, total, failed.get(), fin);
            });
        }
    }

    void cancel(String jobId) {
        AtomicBoolean b = cancelled.get(jobId);
        if (b != null) b.set(true);
    }

    void shutdown() {
        for (AtomicBoolean b : cancelled.values()) b.set(true);
        pool.shutdownNow();
    }

    private boolean fetch(String url, File target) {
        if (target == null || url == null || !url.startsWith("https://")) return false;
        if (target.isFile() && target.length() > 0) return true;
        File dir = target.getParentFile();
        if (dir != null && !dir.isDirectory() && !dir.mkdirs() && !dir.isDirectory()) return false;
        File tmp = new File(target.getPath() + ".part");
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setRequestProperty("User-Agent", "Mozilla/5.0 (Android) HusoonAlHifz");
            if (c.getResponseCode() != 200) return false;
            try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(tmp)) {
                byte[] buf = new byte[16384];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            return tmp.length() > 0 && tmp.renameTo(target);
        } catch (Exception e) {
            return false;
        } finally {
            if (c != null) c.disconnect();
            if (tmp.exists() && !target.exists()) tmp.delete();
        }
    }

    /** {n: file count, bytes: total size} of a folder. */
    static long[] info(File dir) {
        long n = 0, bytes = 0;
        File[] fs = dir == null ? null : dir.listFiles();
        if (fs != null) {
            for (File f : fs) {
                if (f.isDirectory()) {
                    long[] x = info(f);
                    n += x[0];
                    bytes += x[1];
                } else if (!f.getName().endsWith(".part")) {
                    n++;
                    bytes += f.length();
                }
            }
        }
        return new long[]{n, bytes};
    }

    static void deleteTree(File f) {
        if (f == null || !f.exists()) return;
        File[] fs = f.listFiles();
        if (fs != null) for (File x : fs) deleteTree(x);
        f.delete();
    }
}
