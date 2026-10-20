import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class ComplaintApp extends JFrame {
    private JComboBox<String> categoryBox;
    private JComboBox<String> priorityBox;
    private JTextArea descArea;
    private JButton submitBtn;

    public ComplaintApp() {
        // Window UI Configurations
        setTitle("Ministry of Fisheries - IT Helpdesk Portal");
        setSize(450, 480);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null); // Screen එක මැදට ගැනීමට
        setLayout(null);

        // Header Title
        JLabel titleLabel = new JLabel("IT Complaint Submission", SwingConstants.CENTER);
        titleLabel.setFont(new Font("Arial", Font.BOLD, 18));
        titleLabel.setBounds(20, 15, 400, 30);
        add(titleLabel);

        // Category Selection
        JLabel lblCategory = new JLabel("Category:");
        lblCategory.setBounds(40, 70, 100, 25);
        add(lblCategory);

        String[] categories = {"Hardware", "Network", "Software", "Intercom", "Other"};
        categoryBox = new JComboBox<>(categories);
        categoryBox.setBounds(150, 70, 220, 25);
        add(categoryBox);

        // Priority Selection
        JLabel lblPriority = new JLabel("Priority:");
        lblPriority.setBounds(40, 115, 100, 25);
        add(lblPriority);

        String[] priorities = {"Low", "Medium", "High", "Critical"};
        priorityBox = new JComboBox<>(priorities);
        priorityBox.setBounds(150, 115, 220, 25);
        add(priorityBox);

        // Problem Description
        JLabel lblDesc = new JLabel("Description:");
        lblDesc.setBounds(40, 160, 100, 25);
        add(lblDesc);

        descArea = new JTextArea();
        descArea.setLineWrap(true);
        JScrollPane scrollPane = new JScrollPane(descArea);
        scrollPane.setBounds(150, 160, 220, 120);
        add(scrollPane);

        // Submit Button
        submitBtn = new JButton("Submit Complaint");
        submitBtn.setBounds(150, 300, 220, 35);
        submitBtn.setBackground(new Color(0, 120, 215));
        submitBtn.setForeground(Color.WHITE);
        submitBtn.setFont(new Font("Arial", Font.BOLD, 14));
        add(submitBtn);

        // Submit Button Click Event
        submitBtn.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                sendComplaintToBackend();
            }
        });
    }

    private void sendComplaintToBackend() {
        String category = (String) categoryBox.getSelectedItem();
        String priority = (String) priorityBox.getSelectedItem();
        String description = descArea.getText().trim();

        if (description.isEmpty()) {
            JOptionPane.showMessageDialog(this, "Please enter a description of the issue!", "Warning", JOptionPane.WARNING_MESSAGE);
            return;
        }

        try {
            // Python Backend API එකට යවන JSON Payload එක
            // (දැනට user_id එක සාම්පලයක් ලෙස 1 ලෙස දමා ඇත)
            String jsonPayload = String.format(
                "{\"user_id\": 1, \"category\": \"%s\", \"priority\": \"%s\", \"description\": \"%s\"}",
                category, priority, description.replace("\n", " ")
            );

            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("http://127.0.0.1:8000/api/complaints"))
                    .header("Content-Type", "application/json")
                    .header("X-API-Key", System.getenv("DESKTOP_API_KEY") != null ? System.getenv("DESKTOP_API_KEY") : System.getProperty("DESKTOP_API_KEY", ""))
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                JOptionPane.showMessageDialog(this, "Complaint Submitted Successfully!\nAPI Response: " + response.body(), "Success", JOptionPane.INFORMATION_MESSAGE);
                descArea.setText(""); // Form එක Clear කිරීම
            } else {
                JOptionPane.showMessageDialog(this, "Failed to submit ticket. Server returned: " + response.statusCode(), "Error", JOptionPane.ERROR_MESSAGE);
            }

        } catch (Exception ex) {
            JOptionPane.showMessageDialog(this, "Connection Error: " + ex.getMessage(), "Error", JOptionPane.ERROR_MESSAGE);
            ex.printStackTrace();
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            new ComplaintApp().setVisible(true);
        });
    }
}
