import * as Yup from 'yup';
import {
  startOfHour, parseISO, isBefore, format,
} from 'date-fns';


import User from '../models/User';
import Appointment from '../models/Appointment';
import File from '../models/File';
import Notification from '../schema/Notification';

class AppointmentController {
  async index(req, res) {
    const { page = 1 } = req.query;
    const appointments = await Appointment.findAll({
      where: {
        canceled_at: null,
        user_id: req.userId,
      },
      order: ['date'],
      attributes: ['id', 'date'],
      limit: 20,
      offset: (page - 1) * 20,
      include: [
        {
          model: User,
          as: 'provider',
          attributes: ['id', 'name'],
          include: [
            {
              model: File,
              as: 'avatar',
              attributes: ['id', 'path', 'url'],
            },
          ],
        },
      ],
    });
    return res.json(appointments);
  }

  async store(req, res) {
    // TODO Implement personalized validation messages
    const schema = Yup.object().shape({
      provider_id: Yup.number().integer().strict().required(),
      date: Yup.date().required(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { provider_id, date } = req.body;

    if (provider_id === req.userId) {
      return res.status(401).json({ error: 'User id and Provider id must be different' });
    }

    const isProvider = await User.findOne({
      where: {
        provider: true,
        id: provider_id,
      },
    });

    if (!isProvider) {
      return res.status(404).json({ error: 'You can only create appointments to providers' });
    }

    const hourStart = startOfHour(parseISO(date));

    if (isBefore(hourStart, new Date())) {
      return res.status(400).json({ error: 'Past dates are not allowed' });
    }

    const notAvailiable = await Appointment.findOne({
      where: {
        provider_id,
        canceled_at: null,
        date: hourStart,
      },
    });

    if (notAvailiable) {
      return res.status(400).json({ error: 'Requested date/time is not available' });
    }

    const newAppointment = await Appointment.create({
      user_id: req.userId,
      provider_id,
      date: hourStart,
    });

    const user = await User.findByPk(
      req.userId,
      {
        attributes: ['name'],
      },
    );
    const formattedDate = format(
      hourStart,
      "MMMM d, yyyy, 'at' H:mm'h'",
    );

    const notification = await Notification.create({
      content: `New appointment from ${user.name} to ${formattedDate}`,
      user: provider_id,
    });

    return res.json(newAppointment);
  }
}

export default new AppointmentController();
