# 📨 Client Inquiry Management System - Complete Guide

## Overview

The Client Inquiry Management System is a comprehensive module that allows all users to submit client inquiries and enables partners to review, communicate, and convert inquiries into active clients.

---

## 🎯 Key Features

### ✅ Inquiry Creation (All Users)
- **Access**: Available to all users (Admin, Partner, Team Leader, Team Member)
- **Quick Access**: "+ New Client Inquiry" button available in "My Inquiries" section
- **Rich Data Capture**: 
  - Client Name* (Required)
  - Company Name
  - Contact Person Name
  - Mobile Number* (Required)
  - Email ID
  - Type of Service Required* (Dropdown)
  - Inquiry Description / Notes
  - Expected Timeline
  - Source of Inquiry

### 📊 My Inquiries Dashboard (All Users)
- View all personally submitted inquiries
- Track inquiry status in real-time
- Filter by status (Pending, Approved, Converted, Rejected)
- View communication history with partners
- Send messages to partners for clarifications
- See when inquiries were reviewed and by whom

### 🔍 Partner Review Dashboard
- Comprehensive inquiry management interface
- Advanced filtering options:
  - By status
  - By work type
  - By submitter
  - By date
- Search by client name, company, mobile, or email
- Sort by date, client name, or status

### 💬 Communication System
- Built-in threaded chat between users and partners
- Real-time message exchange
- Full conversation history maintained
- Non-editable messages for audit integrity
- Partner and user messages clearly distinguished

### ⚙️ Partner Actions
1. **Edit/Modify Inquiry**: Update client details and information
2. **Communicate**: Send messages to inquiry creator
3. **Convert to Client**: Approve and add to client master
4. **Put On Hold**: Temporarily pause inquiry with reason
5. **Reject**: Decline inquiry with detailed reason

### 📈 Status Tracking
- **Pending Review**: Initial status when submitted
- **Approved**: Inquiry approved by partner
- **Converted to Client**: Successfully added to client master
- **On Hold**: Temporarily paused
- **Rejected**: Declined with reason

### 📋 Audit Trail
Every inquiry maintains complete history:
- Created by (user name and ID)
- Submission date and time
- Modified by (partner/user)
- Review date and time
- Conversion action (who converted and when)
- All communication messages with timestamps

---

## 🚀 Setup Instructions

### 1. Database Setup

Run the SQL file to create required tables:

```bash
# Execute this SQL file in your Supabase SQL Editor
database-inquiry-system-complete.sql
```

This will create:
- `client_inquiries` table with all required fields
- `inquiry_communications` table for chat messages
- Indexes for optimized queries
- Row Level Security policies

### 2. Backend Setup

The backend endpoints are already configured in `/supabase/functions/server/index.tsx`:

**Inquiry Endpoints:**
- `POST /inquiries` - Create new inquiry
- `GET /inquiries` - Get all inquiries (Partner/Admin)
- `GET /inquiries/pending` - Get pending inquiries
- `GET /inquiries/user/:userId` - Get user's own inquiries
- `PUT /inquiries/:id` - Update inquiry details
- `PUT /inquiries/:id/status` - Update inquiry status

**Communication Endpoints:**
- `POST /inquiries/:id/communications` - Add message
- `GET /inquiries/:id/communications` - Get all messages for inquiry

### 3. Frontend Components

All components are already created and integrated:
- `MyInquiries.tsx` - User inquiry dashboard
- `InquiryManagement.tsx` - Partner management interface
- `ViewInquiryModal.tsx` - View inquiry with communication (users)
- `ReviewInquiryModalEnhanced.tsx` - Review with communication (partners)
- `CreateInquiryModal.tsx` - Create new inquiry form

### 4. Navigation Setup

Menu items have been added to all user roles:
- **All Users**: "My Inquiries" menu item
- **Partners Only**: "Inquiry Management" menu item

---

## 📱 User Guide

### For All Users (Creating Inquiries)

#### Step 1: Access My Inquiries
1. Click "My Inquiries" in the sidebar
2. View your inquiry dashboard with statistics

#### Step 2: Create New Inquiry
1. Click "+ New Client Inquiry" button
2. Fill in the form:
   - **Client Name**: Full name of the client (Required)
   - **Company Name**: Business name if applicable
   - **Contact Person**: Primary contact person
   - **Mobile Number**: 10-digit mobile number (Required)
   - **Email ID**: Email address
   - **Type of Work Required**: Select from dropdown (Required)
   - **Notes**: Additional details about the inquiry
   - **Expected Timeline**: When client needs the service
   - **Source of Inquiry**: How you got this lead (e.g., Referral, Website)

3. Click "Submit to Partner"

#### Step 3: Track Inquiry Status
- View status in "My Inquiries" dashboard
- Statuses: Pending Review → Approved → Converted to Client
- Or: Pending Review → On Hold / Rejected

#### Step 4: Communicate with Partner
1. Click "View Details" on any inquiry
2. Scroll to "Communication Thread"
3. Type your message and click "Send"
4. Partner will receive the message
5. View partner responses in the same thread

---

## 🎯 Partner Guide

### Accessing Inquiry Management

1. Click "Inquiry Management" in the sidebar
2. View comprehensive dashboard with:
   - Total inquiries
   - Pending count
   - Converted count
   - On Hold count
   - Rejected count

### Filtering Inquiries

Use the advanced filters to find specific inquiries:
- **Search Bar**: Search by name, company, mobile, email
- **Status Filter**: Filter by inquiry status
- **Work Type Filter**: Filter by service type
- **Submitter Filter**: Filter by who submitted
- **Sort Options**: Sort by date, client name, or status

### Reviewing an Inquiry

1. Click "Review" button on any inquiry
2. View complete inquiry details
3. Choose action:

#### Option 1: Convert to Client
1. Review all details
2. Click "✅ Approve & Convert to Client"
3. Client is automatically added to client master
4. Inquiry status changes to "Converted to Client"
5. You can now create tasks for this client

#### Option 2: Edit Details
1. Click "✏️ Edit Details"
2. Update any information
3. Click "Save Changes"
4. Continue with approval or other actions

#### Option 3: Communicate
1. View communication panel on the right
2. Type message in text area
3. Click "Send Message"
4. User will see your message in their inquiry view
5. Conversation continues until resolved

#### Option 4: Put On Hold
1. Click "⏸️ Put On Hold"
2. Enter reason for holding
3. Click "Confirm Hold"
4. Inquiry status changes to "On Hold"
5. You can review it later

#### Option 5: Reject
1. Click "❌ Reject"
2. Enter detailed rejection reason (Required)
3. Click "Confirm Rejection"
4. User will be notified with the reason

---

## 💡 Best Practices

### For Users Submitting Inquiries

1. **Be Detailed**: Provide as much information as possible
2. **Contact Information**: Always include accurate mobile number
3. **Timeline**: Specify realistic expected timeline
4. **Follow Up**: Check communication thread regularly
5. **Source Tracking**: Always mention source for analytics

### For Partners Reviewing Inquiries

1. **Quick Response**: Review inquiries within 24-48 hours
2. **Clear Communication**: Provide clear reasons for hold/rejection
3. **Use Communication**: Ask for clarifications before rejecting
4. **Complete Information**: Edit to add missing details before converting
5. **Track Sources**: Monitor which sources bring quality leads

---

## 📊 Dashboard Insights

### My Inquiries (Users)
- **Total Inquiries**: All submitted inquiries
- **Pending Review**: Waiting for partner action
- **Approved**: Accepted by partner
- **Rejected/Hold**: Declined or paused

### Inquiry Management (Partners)
- **Total**: All inquiries in system
- **Pending**: Requiring immediate action
- **Converted**: Successfully added to client base
- **On Hold**: Temporarily paused
- **Rejected**: Declined inquiries

---

## 🔔 Notifications

The system captures complete audit trail for:
- Inquiry creation → Notifies partner
- Partner message → Notifies user
- Status change → Notifies creator
- Conversion → Notifies creator

---

## 🛠️ Technical Architecture

### Database Schema

**client_inquiries table:**
```sql
- id (Primary Key)
- client_name (Text, Required)
- company_name (Text)
- contact_person (Text)
- mobile_number (Text, Required)
- email (Text)
- work_type (Text, Required)
- notes (Text)
- expected_timeline (Text)
- source_of_inquiry (Text)
- status (Text, Default: 'Pending Review')
- submitted_by (Text, Required)
- submitted_by_id (BigInt)
- reviewed_by (Text)
- reviewed_by_id (BigInt)
- reviewed_at (Timestamp)
- rejection_reason (Text)
- created_at (Timestamp)
- updated_at (Timestamp)
```

**inquiry_communications table:**
```sql
- id (Primary Key)
- inquiry_id (Foreign Key → client_inquiries)
- message (Text, Required)
- sender_id (Text, Required)
- sender_name (Text, Required)
- sender_role (Text, Required) -- 'user' or 'partner'
- created_at (Timestamp)
```

### API Endpoints

All endpoints use base URL: `https://{projectId}.supabase.co/functions/v1/make-server-0abfa7cf`

**Inquiry CRUD:**
- `POST /inquiries` - Create inquiry
- `GET /inquiries` - Get all (partners)
- `GET /inquiries/pending` - Get pending
- `GET /inquiries/user/:userId` - Get user's inquiries
- `PUT /inquiries/:id` - Update inquiry
- `PUT /inquiries/:id/status` - Update status

**Communications:**
- `POST /inquiries/:id/communications` - Send message
- `GET /inquiries/:id/communications` - Get messages

---

## 🔒 Security Features

1. **Role-Based Access**:
   - Users can only view their own inquiries
   - Partners can view all inquiries
   - Only partners can convert to clients

2. **Audit Trail**:
   - All actions are logged with user ID and timestamp
   - Communication messages are non-editable
   - Complete history maintained

3. **Row Level Security**:
   - Database policies ensure data isolation
   - Authenticated access required
   - Partner-specific update permissions

---

## 📈 Conversion Metrics

Track these key metrics in the dashboard:
- **Conversion Rate**: (Converted / Total) × 100
- **Pending Rate**: (Pending / Total) × 100
- **Rejection Rate**: (Rejected / Total) × 100
- **Average Response Time**: Time from submission to first action
- **Top Sources**: Which sources bring most conversions
- **Top Submitters**: Which users bring quality leads

---

## ❓ FAQs

### Q: Can I edit an inquiry after submission?
**A**: No, users cannot edit after submission. However, you can communicate with the partner to request changes, and partners can edit the details before conversion.

### Q: How long does partner review take?
**A**: Partners typically review within 24-48 hours. You'll receive updates via the communication thread.

### Q: What happens after conversion to client?
**A**: The client is added to the client master, and partners can create tasks and manage billing for them.

### Q: Can I see rejected inquiry reasons?
**A**: Yes, in the "View Details" modal, rejection reasons are displayed prominently.

### Q: Are communications private?
**A**: Communications are visible only to the inquiry creator and partners who review it.

### Q: Can I delete an inquiry?
**A**: No, inquiries cannot be deleted to maintain audit trail. Partners can reject if needed.

---

## 🆘 Troubleshooting

### Issue: "Failed to load inquiries"
**Solution**: 
1. Check internet connection
2. Verify database tables are created
3. Check browser console for errors
4. Refresh the page

### Issue: "Failed to send message"
**Solution**:
1. Ensure message is not empty
2. Check if inquiry is not in "Converted" or "Rejected" status
3. Verify API endpoint is accessible

### Issue: "Cannot convert to client"
**Solution**:
1. Ensure all required fields are filled
2. Check if client with same name already exists
3. Verify partner has necessary permissions

---

## 🎓 Training Resources

### Video Tutorials (To Be Created)
1. Creating Your First Inquiry (5 mins)
2. Partner Review Workflow (10 mins)
3. Using Communication Thread (5 mins)
4. Advanced Filtering and Search (7 mins)

### Quick Start Guide
1. New User: Watch "Creating Your First Inquiry"
2. Partners: Watch "Partner Review Workflow"
3. Both: Read this complete guide

---

## 📞 Support

For technical support or feature requests:
- Contact: System Administrator
- Email: admin@kapsca.in
- Phone: [Your Support Number]

---

## 🔄 Version History

**Version 1.0** (April 2026)
- Initial release
- Complete inquiry management system
- Communication thread
- Status tracking
- Audit trail

---

## 🚀 Future Enhancements

Planned features for future versions:
- Email notifications
- WhatsApp integration
- Automated follow-ups
- Lead scoring
- Conversion analytics dashboard
- Export to Excel/PDF
- Bulk operations
- Custom fields configuration

---

**Created**: April 2026  
**Last Updated**: April 27, 2026  
**Version**: 1.0  
**Status**: Production Ready ✅
